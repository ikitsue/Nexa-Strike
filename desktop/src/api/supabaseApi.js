import { supabase } from '../lib/supabaseClient';

const USER_PROFILE_COLUMNS =
  'id,email,username,steam_id,profile_picture,role,banned,ban_reason,banned_at,created_at';
const USER_ADMIN_COLUMNS =
  'id,email,username,role,created_at,banned,ban_reason,banned_at';
const USER_BAN_COLUMNS = 'id,username,banned,ban_reason,banned_at';

const sanitizeStorageFileName = (fileName) => {
  const safeName = (fileName || 'file')
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'file';

  const extension = fileName.includes('.') ? fileName.slice(fileName.lastIndexOf('.')) : '';
  const truncatedBase = safeName.length > 80 ? safeName.slice(0, 80) : safeName;

  return `${truncatedBase}${extension}`.toLowerCase();
};

const uploadLineImage = async (file) => {
  if (!file) return null;
  if (file.type && !file.type.startsWith('image/')) {
    throw new Error('Line zoom images must be image files');
  }

  const safeFileName = sanitizeStorageFileName(file.name || 'line-image');
  const uniquePrefix = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const { data, error } = await supabase.storage
    .from('utility-points')
    .upload(`line-images/${uniquePrefix}-${safeFileName}`, file);

  if (error) throw error;
  return data.path;
};

// Auth API
export const authAPI = {
  register: async (email, password, username, captchaToken) => {
    try {
      if (!captchaToken) {
        throw new Error('Captcha token not found. Please complete the captcha verification.');
      }

      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          captchaToken,
          data: {
            username,
          },
        },
      });
      if (authError) throw authError;

      if (!authData.session) {
        return { data: null, token: null, requiresEmailConfirmation: true };
      }

      // Trigger automatically creates user profile via PostgreSQL trigger
      // Wait a moment for trigger to execute
      await new Promise(resolve => setTimeout(resolve, 500));

      // Get user profile that was auto-created by trigger
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select(USER_PROFILE_COLUMNS)
        .eq('email', email)
        .single();

      if (userError) throw userError;

      return { data: userData, token: authData.session.access_token };
    } catch (error) {
      throw new Error(error.message || 'Registration failed');
    }
  },

  login: async (email, password, captchaToken) => {
    try {
      if (!captchaToken) {
        throw new Error('Captcha token not found. Please complete the captcha verification.');
      }

      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
        options: { captchaToken },
      });

      if (error) throw error;

      // Get user profile by email (not by auth ID, since they're different)
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select(USER_PROFILE_COLUMNS)
        .eq('email', email)
        .single();

      if (userError) throw userError;

      return { data: userData, token: data.session?.access_token };
    } catch (error) {
      throw new Error(error.message || 'Login failed');
    }
  },

  logout: async () => {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  },
};

// Maps API
export const mapsAPI = {
  getAll: async () => {
    try {
      const { data, error } = await supabase.from('maps').select('*');
      if (error) throw error;
      return { data };
    } catch (error) {
      throw new Error(error.message || 'Failed to fetch maps');
    }
  },

  getById: async (mapId) => {
    try {
      const { data: mapData, error: mapError } = await supabase
        .from('maps')
        .select('*')
        .eq('id', mapId)
        .single();

      if (mapError) throw mapError;

      const { data: pointsData, error: pointsError } = await supabase
        .from('utility_points')
        .select('*')
        .eq('map_id', mapId);

      if (pointsError) throw pointsError;

      return {
        data: {
          ...mapData,
          utility_points: pointsData,
        },
      };
    } catch (error) {
      throw new Error(error.message || 'Failed to fetch map');
    }
  },

  create: async (formData) => {
    try {
      // Handle image upload if exists
      let imageUrl = null;
      if (formData.get('file')) {
        const file = formData.get('file');
        const safeFileName = sanitizeStorageFileName(file.name || 'file');
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('maps')
          .upload(`${Date.now()}-${safeFileName}`, file);

        if (uploadError) throw uploadError;
        imageUrl = uploadData.path;
      }

      const { data, error } = await supabase
        .from('maps')
        .insert([
          {
            name: formData.get('name'),
            image_url: imageUrl,
          },
        ])
        .select();

      if (error) throw error;
      return { data: data[0] };
    } catch (error) {
      throw new Error(error.message || 'Failed to create map');
    }
  },
};

// Utility Points API
export const utilityPointsAPI = {
  getByMapId: async (mapId) => {
    try {
      const { data, error } = await supabase
        .from('utility_points')
        .select('*')
        .eq('map_id', mapId);

      if (error) throw error;
      return { data };
    } catch (error) {
      throw new Error(error.message || 'Failed to fetch utility points');
    }
  },

  getByMapIds: async (mapIds) => {
    if (!mapIds.length) return { data: [] };

    try {
      const pageSize = 1000;
      const points = [];

      for (let from = 0; ; from += pageSize) {
        const { data, error } = await supabase
          .from('utility_points')
          .select('*')
          .in('map_id', mapIds)
          .order('map_id')
          .order('id')
          .range(from, from + pageSize - 1);

        if (error) throw error;
        points.push(...(data || []));
        if (!data || data.length < pageSize) break;
      }

      return { data: points };
    } catch (error) {
      throw new Error(error.message || 'Failed to fetch utility points');
    }
  },

  create: async (mapId, formData) => {
    try {
      let mediaUrl = null;
      let imageUrl = null;
      let videoUrl = null;
      
      const externalVideoUrl = formData.get('video_url')?.trim() || null;
      if (formData.get('file')) {
        const file = formData.get('file');
        const safeFileName = sanitizeStorageFileName(file.name || 'file');
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('utility-points')
          .upload(`${mapId}/${Date.now()}-${safeFileName}`, file);

        if (uploadError) throw uploadError;
        mediaUrl = uploadData.path;

        // Determine if it's a video or image
        if (file.type.startsWith('video/')) {
          videoUrl = mediaUrl;
        } else if (file.type.startsWith('image/')) {
          imageUrl = mediaUrl;
        }
      }

      const insertData = {
        map_id: mapId,
        name: formData.get('name'),
        utility_type: formData.get('utility_type'),
        x: parseFloat(formData.get('x')),
        y: parseFloat(formData.get('y')),
        description: formData.get('description'),
        suggested_by: formData.get('suggested_by')?.trim() || null,
        image_url: imageUrl,
        video_url: videoUrl || externalVideoUrl,
      };
      if (formData.get('utility_type') === 'line') {
        insertData.zoom_in_image_url = await uploadLineImage(formData.get('zoom_in_file'));
        insertData.zoom_out_image_url = await uploadLineImage(formData.get('zoom_out_file'));
      }
      const teamValue = formData.get('team');
      if (teamValue) insertData.team = teamValue;

      let response = await supabase
        .from('utility_points')
        .insert([insertData], { returning: 'minimal' });

      if (response.error && teamValue) {
        delete insertData.team;
        response = await supabase
          .from('utility_points')
          .insert([insertData], { returning: 'minimal' });
      }

      if (response.error) throw response.error;
      return { data: null };
    } catch (error) {
      throw new Error(error.message || 'Failed to create utility point');
    }
  },

  update: async (pointId, formData) => {
    try {
      const externalVideoUrl = formData.get('video_url')?.trim() || null;
      let mediaUrl = null;
      let uploadedFileType = null;
      if (formData.get('file')) {
        const file = formData.get('file');
        uploadedFileType = file.type;
        const safeFileName = sanitizeStorageFileName(file.name || 'file');
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('utility-points')
          .upload(`${Date.now()}-${safeFileName}`, file);

        if (uploadError) throw uploadError;
        mediaUrl = uploadData.path;
      }

      const updateData = {
        name: formData.get('name'),
        utility_type: formData.get('utility_type'),
        x: parseFloat(formData.get('x')),
        y: parseFloat(formData.get('y')),
        description: formData.get('description'),
      };
      if (formData.has('suggested_by')) {
        updateData.suggested_by = formData.get('suggested_by').trim() || null;
      }
      if (formData.get('utility_type') === 'line') {
        const zoomInImageUrl = await uploadLineImage(formData.get('zoom_in_file'));
        const zoomOutImageUrl = await uploadLineImage(formData.get('zoom_out_file'));
        if (zoomInImageUrl) updateData.zoom_in_image_url = zoomInImageUrl;
        if (zoomOutImageUrl) updateData.zoom_out_image_url = zoomOutImageUrl;
      }
      const teamValue = formData.get('team');
      if (teamValue) updateData.team = teamValue;

      if (externalVideoUrl) {
        updateData.video_url = externalVideoUrl;
        updateData.image_url = null;
      }

      if (mediaUrl) {
        if (uploadedFileType && uploadedFileType.startsWith('video/')) {
          updateData.video_url = mediaUrl;
          updateData.image_url = null;
        } else {
          updateData.image_url = mediaUrl;
          updateData.video_url = null;
        }
      }

      let response = await supabase
        .from('utility_points')
        .update(updateData, { returning: 'minimal' })
        .eq('id', pointId);

      if (response.error && teamValue) {
        delete updateData.team;
        response = await supabase
          .from('utility_points')
          .update(updateData, { returning: 'minimal' })
          .eq('id', pointId);
      }

      if (response.error) throw response.error;
      return { data: null };
    } catch (error) {
      throw new Error(error.message || 'Failed to update utility point');
    }
  },

  delete: async (pointId) => {
    try {
      const { error } = await supabase
        .from('utility_points')
        .delete()
        .eq('id', pointId);

      if (error) throw error;
      return { success: true };
    } catch (error) {
      throw new Error(error.message || 'Failed to delete utility point');
    }
  },
};

// Suggestions API
export const suggestionsAPI = {
  getAll: async () => {
    try {
      const { data, error } = await supabase
        .from('suggestions')
        .select('*, users(username)')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return { data };
    } catch (error) {
      throw new Error(error.message || 'Failed to fetch suggestions');
    }
  },

  create: async (suggestion) => {
    try {
      const { data: user } = await supabase.auth.getUser();
      if (!user || !user.user.email) throw new Error('No authenticated user');

      // Get user profile by email to get the INTEGER user_id
      const { data: userProfile, error: userError } = await supabase
        .from('users')
        .select('id')
        .eq('email', user.user.email)
        .single();

      if (userError) throw userError;

      const { data, error } = await supabase
        .from('suggestions')
        .insert([
          {
            ...suggestion,
            user_id: userProfile.id,
          },
        ])
        .select();

      if (error) throw error;
      return { data: data[0] };
    } catch (error) {
      throw new Error(error.message || 'Failed to create suggestion');
    }
  },

  update: async (id, updates) => {
    try {
      const allowedFields = new Set(['title', 'description', 'map_id', 'utility_type', 'status']);
      if (!updates || Object.keys(updates).some((field) => !allowedFields.has(field))) {
        throw new Error('Unsupported suggestion fields');
      }

      const { data, error } = await supabase
        .from('suggestions')
        .update(updates)
        .eq('id', id)
        .select();

      if (error) throw error;
      return { data: data[0] };
    } catch (error) {
      throw new Error(error.message || 'Failed to update suggestion');
    }
  },

  delete: async (id) => {
    try {
      const { error } = await supabase
        .from('suggestions')
        .delete()
        .eq('id', id);

      if (error) throw error;
      return { success: true };
    } catch (error) {
      throw new Error(error.message || 'Failed to delete suggestion');
    }
  },
};

const loadTicketConversations = async (ticketQuery, includeAuthorUsernames = false) => {
  const { data: tickets, error: ticketError } = await ticketQuery;
  if (ticketError) throw ticketError;
  if (!tickets.length) return { data: [] };

  const { data: messages, error: messagesError } = await supabase
    .from('ticket_messages')
    .select('*')
    .in('ticket_id', tickets.map((ticket) => ticket.id))
    .order('created_at', { ascending: true });

  if (messagesError) throw messagesError;

  let usernamesByEmail = new Map();
  if (includeAuthorUsernames) {
    const authorEmails = [...new Set(
      messages
        .filter((message) => message.author_role === 'customer')
        .map((message) => message.author_email)
        .filter(Boolean)
    )];
    if (authorEmails.length > 0) {
      const { data: users, error: usersError } = await supabase
        .from('users')
        .select('email,username')
        .in('email', authorEmails);

      if (usersError) throw usersError;
      usernamesByEmail = new Map(
        users.map((user) => [user.email.toLowerCase(), user.username])
      );
    }
  }

  const messagesByTicket = new Map();
  for (const message of messages) {
    const ticketMessages = messagesByTicket.get(message.ticket_id) || [];
    ticketMessages.push({
      ...message,
      author_username: usernamesByEmail.get(message.author_email.toLowerCase()) || null,
    });
    messagesByTicket.set(message.ticket_id, ticketMessages);
  }

  return {
    data: tickets.map((ticket) => ({
      ...ticket,
      ticket_messages: messagesByTicket.get(ticket.id) || [],
    })),
  };
};

export const ticketsAPI = {
  getMine: async () => {
    try {
      return await loadTicketConversations(
        supabase.from('tickets').select('*').order('updated_at', { ascending: false })
      );
    } catch (error) {
      throw new Error(error.message || 'Failed to fetch your support tickets');
    }
  },

  getAll: async () => {
    try {
      return await loadTicketConversations(
        supabase.from('tickets').select('*').order('updated_at', { ascending: false }),
        true
      );
    } catch (error) {
      throw new Error(error.message || 'Failed to fetch support tickets');
    }
  },

  create: async (ticket, captchaToken) => {
    try {
      const { data, error } = await supabase.functions.invoke('create-ticket', {
        body: { ...ticket, captchaToken },
      });
      if (error) throw error;
      return { data };
    } catch (error) {
      let message = error.message || 'Failed to create support ticket';
      if (error.context && typeof error.context.json === 'function') {
        try {
          const response = await error.context.json();
          message = response.error || message;
        } catch (responseError) {
          console.error('Could not read the support-ticket error response:', responseError);
        }
      }
      throw new Error(message);
    }
  },

  addReply: async (ticketId, message, authorRole) => {
    try {
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError) throw authError;
      if (!user?.email) throw new Error('You must be signed in to reply to a ticket');

      const { data, error } = await supabase
        .from('ticket_messages')
        .insert({
          ticket_id: ticketId,
          author_id: user.id,
          author_email: user.email,
          author_role: authorRole,
          message: message.trim(),
        })
        .select()
        .single();

      if (error) throw error;
      return { data };
    } catch (error) {
      throw new Error(error.message || 'Failed to send ticket reply');
    }
  },

  updateStatus: async (ticketId, status) => {
    try {
      const { data, error } = await supabase
        .from('tickets')
        .update({ status })
        .eq('id', ticketId)
        .select()
        .single();

      if (error) throw error;
      return { data };
    } catch (error) {
      throw new Error(error.message || 'Failed to update ticket status');
    }
  },

  assign: async (ticketId, assignedTo) => {
    try {
      const { data, error } = await supabase
        .from('tickets')
        .update({ assigned_to: assignedTo })
        .eq('id', ticketId)
        .select()
        .single();

      if (error) throw error;
      return { data };
    } catch (error) {
      throw new Error(error.message || 'Failed to assign ticket');
    }
  },

  delete: async (ticketId) => {
    try {
      const { error } = await supabase
        .from('tickets')
        .delete()
        .eq('id', ticketId);

      if (error) throw error;
      return { success: true };
    } catch (error) {
      throw new Error(error.message || 'Failed to delete ticket');
    }
  },
};

// Users API
export const usersAPI = {
  getProfile: async () => {
    try {
      const { data: user } = await supabase.auth.getUser();
      if (!user || !user.user.email) throw new Error('No authenticated user');

      const { data, error } = await supabase
        .from('users')
        .select(USER_PROFILE_COLUMNS)
        .eq('email', user.user.email)
        .single();

      if (error) throw error;
      return { data };
    } catch (error) {
      throw new Error(error.message || 'Failed to fetch profile');
    }
  },

  getById: async (userId) => {
    try {
      const { data, error } = await supabase
        .from('users')
        .select(USER_PROFILE_COLUMNS)
        .eq('id', userId)
        .single();

      if (error) throw error;
      return { data };
    } catch (error) {
      throw new Error(error.message || 'Failed to fetch user');
    }
  },

  update: async (userId, updates) => {
    try {
      const allowedFields = new Set(['username', 'steam_id', 'profile_picture']);
      if (!updates || Object.keys(updates).some((field) => !allowedFields.has(field))) {
        throw new Error('Unsupported profile fields');
      }

      const { data, error } = await supabase
        .from('users')
        .update(updates)
        .eq('id', userId)
        .select()
        .single();

      if (error) throw error;
      return { data };
    } catch (error) {
      throw new Error(error.message || 'Failed to update user');
    }
  },

  getAll: async () => {
    try {
      const { data, error } = await supabase
        .from('users')
        .select(USER_ADMIN_COLUMNS)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return { data };
    } catch (error) {
      throw new Error(error.message || 'Failed to fetch users');
    }
  },

  ban: async (userId, banReason) => {
    try {
      const { data: existingUser, error: existingError } = await supabase
        .from('users')
        .select('id')
        .eq('id', userId)
        .maybeSingle();

      if (existingError) throw existingError;
      if (!existingUser) throw new Error('User not found');

      const { data, error } = await supabase
        .from('users')
        .update({
          banned: true,
          ban_reason: banReason || 'Banned by admin',
          banned_at: new Date().toISOString(),
        })
        .eq('id', userId)
        .select(USER_BAN_COLUMNS);

      if (error) throw error;
      if (!data || data.length === 0) throw new Error('User not found');
      return { data: data[0] };
    } catch (error) {
      throw new Error(error.message || 'Failed to ban user');
    }
  },

  unban: async (userId) => {
    try {
      const { data: existingUser, error: existingError } = await supabase
        .from('users')
        .select('id')
        .eq('id', userId)
        .maybeSingle();

      if (existingError) throw existingError;
      if (!existingUser) throw new Error('User not found');

      const { data, error } = await supabase
        .from('users')
        .update({
          banned: false,
          ban_reason: null,
          banned_at: null,
        })
        .eq('id', userId)
        .select(USER_BAN_COLUMNS);

      if (error) throw error;
      if (!data || data.length === 0) throw new Error('User not found');
      return { data: data[0] };
    } catch (error) {
      throw new Error(error.message || 'Failed to unban user');
    }
  },
};

export const achievementsAPI = {
  getMine: async () => {
    try {
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError) throw authError;
      if (!user) throw new Error('No authenticated user');

      const { data, error } = await supabase
        .from('user_achievements')
        .select('achievement_id,unlocked_at')
        .eq('user_id', user.id)
        .order('unlocked_at', { ascending: true });

      if (error) throw error;
      return { data };
    } catch (error) {
      throw new Error(error.message || 'Failed to fetch achievements');
    }
  },

  unlock: async (achievementId) => {
    try {
      if (!['explorer', 'ticket', 'desktop'].includes(achievementId)) {
        throw new Error('Unsupported achievement');
      }

      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError) throw authError;
      if (!user) throw new Error('No authenticated user');

      const { error } = await supabase
        .from('user_achievements')
        .upsert(
          { user_id: user.id, achievement_id: achievementId },
          { onConflict: 'user_id,achievement_id', ignoreDuplicates: true }
        );

      if (error) throw error;
      return { success: true };
    } catch (error) {
      throw new Error(error.message || 'Failed to unlock achievement');
    }
  },
};

// Clips API
export const clipsAPI = {
  getAll: async () => {
    try {
      const { data, error } = await supabase
        .from('clips')
        .select('*, users(username), maps(name)')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return { data };
    } catch (error) {
      throw new Error(error.message || 'Failed to fetch clips');
    }
  },

  upload: async (formData) => {
    try {
      let fileUrl = null;
      if (formData.get('file')) {
        const file = formData.get('file');
        const safeFileName = sanitizeStorageFileName(file.name || 'file');
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('clips')
          .upload(`${Date.now()}-${safeFileName}`, file);

        if (uploadError) throw uploadError;
        fileUrl = uploadData.path;
      }

      const { data: user } = await supabase.auth.getUser();
      if (!user || !user.user.email) throw new Error('No authenticated user');

      // Get user profile by email to get the INTEGER user_id
      const { data: userProfile, error: userError } = await supabase
        .from('users')
        .select('id')
        .eq('email', user.user.email)
        .single();

      if (userError) throw userError;

      const { data, error } = await supabase
        .from('clips')
        .insert([
          {
            title: formData.get('title'),
            description: formData.get('description'),
            map_id: parseInt(formData.get('map_id')),
            utility_type: formData.get('utility_type'),
            user_id: userProfile.id,
            file_path: fileUrl,
          },
        ])
        .select();

      if (error) throw error;
      return { data: data[0] };
    } catch (error) {
      throw new Error(error.message || 'Failed to upload clip');
    }
  },
};

// Helper to get full file URL
export const getFileUrl = (filePath) => {
  if (!filePath) return null;
  if (filePath.startsWith('http')) return filePath;

  const cleanPath = filePath.replace(/^\/+|\/+$/g, '');

  // Serve relative app assets and backend upload files directly
  if (filePath.startsWith('/') || cleanPath.startsWith('uploads/') || cleanPath.startsWith('images/')) {
    return `${import.meta.env.BASE_URL}${cleanPath}`;
  }

  // If the path already includes the bucket name, use it directly
  if (cleanPath.startsWith('utility-points/') || cleanPath.startsWith('maps/')) {
    const [bucketName, ...rest] = cleanPath.split('/');
    const encodedObjectPath = rest.map((segment) => encodeURIComponent(segment)).join('/');
    return `${import.meta.env.VITE_SUPABASE_URL}/storage/v1/object/public/${bucketName}/${encodedObjectPath}`;
  }

  // Otherwise determine Supabase bucket by known storage path conventions
  const isUtilityPoint = /^\d+\/\d+-/.test(cleanPath);
  const bucketName = isUtilityPoint ? 'utility-points' : 'maps';
  const encodedPath = cleanPath.split('/').map((segment) => encodeURIComponent(segment)).join('/');

  return `${import.meta.env.VITE_SUPABASE_URL}/storage/v1/object/public/${bucketName}/${encodedPath}`;
};

export const getFileUrlFallbacks = (filePath) => {
  if (!filePath) return [];
  const urls = [getFileUrl(filePath)];
  const cleanPath = filePath.replace(/^\/+|\/+$/g, '');

  const encodeSegments = (path) => path.split('/').map((segment) => encodeURIComponent(segment)).join('/');

  if (cleanPath.startsWith('maps/')) {
    const objectPath = cleanPath.slice('maps/'.length);
    urls.push(`${import.meta.env.VITE_SUPABASE_URL}/storage/v1/object/public/utility-points/${encodeSegments(objectPath)}`);
  }

  if (cleanPath.startsWith('utility-points/')) {
    const objectPath = cleanPath.slice('utility-points/'.length);
    urls.push(`${import.meta.env.VITE_SUPABASE_URL}/storage/v1/object/public/maps/${encodeSegments(objectPath)}`);
  }

  if (!cleanPath.startsWith('maps/') && !cleanPath.startsWith('utility-points/')) {
    urls.push(`${import.meta.env.VITE_SUPABASE_URL}/storage/v1/object/public/utility-points/${encodeSegments(cleanPath)}`);
    urls.push(`${import.meta.env.VITE_SUPABASE_URL}/storage/v1/object/public/maps/${encodeSegments(cleanPath)}`);
  }

  return urls.filter(Boolean);
};
