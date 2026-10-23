const { Resend } = require('resend');

const resend = new Resend(process.env.RESEND_API_KEY);

const emailService = {
  // Send welcome email after registration
  sendWelcomeEmail: async (email, username) => {
    try {
      console.log(`📧 Attempting to send welcome email to ${email}`);
      
      const response = await resend.emails.send({
        from: process.env.SENDER_EMAIL || 'onboarding@resend.dev',
        to: email,
        subject: 'Welcome to NexaStrike!',
        html: `
          <!DOCTYPE html>
          <html>
            <head>
              <meta charset="UTF-8">
              <title>Welcome to NexaStrike</title>
              <style>
                body {
                  font-family: Arial, sans-serif;
                  line-height: 1.6;
                  color: #333;
                  background-color: #f4f4f4;
                }
                .container {
                  max-width: 600px;
                  margin: 0 auto;
                  padding: 20px;
                  background-color: #fff;
                  border-radius: 8px;
                  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
                }
                .header {
                  background: linear-gradient(135deg, #00d4ff 0%, #0a0e27 100%);
                  color: white;
                  padding: 20px;
                  border-radius: 4px;
                  text-align: center;
                }
                .content {
                  padding: 20px 0;
                }
                .footer {
                  border-top: 1px solid #ddd;
                  padding-top: 20px;
                  font-size: 12px;
                  color: #666;
                  text-align: center;
                }
                .button {
                  display: inline-block;
                  background-color: #00d4ff;
                  color: black;
                  padding: 12px 30px;
                  border-radius: 4px;
                  text-decoration: none;
                  font-weight: bold;
                  margin-top: 20px;
                }
              </style>
            </head>
            <body>
              <div class="container">
                <div class="header">
                  <h1>🎮 Welcome to NexaStrike!</h1>
                </div>
                
                <div class="content">
                  <p>Hi <strong>${username}</strong>,</p>
                  
                  <p>Thank you for registering with NexaStrike! We're excited to have you on board.</p>
                  
                  <p>NexaStrike is your ultimate utility guide for CS2 (Counter-Strike 2). Learn all the best smoke lineups, molotov throws, flash placements, and more!</p>
                  
                  <h3>What you can do:</h3>
                  <ul>
                    <li>📍 View utility points on detailed map layouts</li>
                    <li>🎬 Watch and share video clips of utility lineups</li>
                    <li>💡 Submit suggestions for new utility techniques</li>
                    <li>👥 Connect with the CS2 community</li>
                  </ul>
                  
                  <p>Your account is now active and ready to use. Log in to get started!</p>
                  
                  <p>Best regards,<br><strong>The NexaStrike Team</strong></p>
                </div>
                
                <div class="footer">
                  <p>© 2026 NexaStrike. All rights reserved.</p>
                </div>
              </div>
            </body>
          </html>
        `,
      });

      console.log('Welcome email sent to:', email);
      return response;
    } catch (error) {
      console.error('Error sending welcome email:', error);
      // Don't throw error - registration should still succeed even if email fails
      return null;
    }
  },

  // Send ban notification email
  sendBanNotification: async (email, username, banReason) => {
    try {
      const response = await resend.emails.send({
        from: process.env.SENDER_EMAIL || 'onboarding@resend.dev',
        to: email,
        subject: 'Account Ban Notification - NexaStrike',
        html: `
          <!DOCTYPE html>
          <html>
            <head>
              <meta charset="UTF-8">
              <title>Account Ban Notification</title>
              <style>
                body {
                  font-family: Arial, sans-serif;
                  line-height: 1.6;
                  color: #333;
                  background-color: #f4f4f4;
                }
                .container {
                  max-width: 600px;
                  margin: 0 auto;
                  padding: 20px;
                  background-color: #fff;
                  border-radius: 8px;
                  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
                }
                .header {
                  background-color: #f44336;
                  color: white;
                  padding: 20px;
                  border-radius: 4px;
                  text-align: center;
                }
                .content {
                  padding: 20px 0;
                }
                .warning-box {
                  background-color: #fff3cd;
                  border-left: 4px solid #ffc107;
                  padding: 15px;
                  margin: 20px 0;
                  border-radius: 4px;
                }
                .footer {
                  border-top: 1px solid #ddd;
                  padding-top: 20px;
                  font-size: 12px;
                  color: #666;
                  text-align: center;
                }
              </style>
            </head>
            <body>
              <div class="container">
                <div class="header">
                  <h1>🚫 Account Suspended</h1>
                </div>
                
                <div class="content">
                  <p>Hi <strong>${username}</strong>,</p>
                  
                  <p>We regret to inform you that your NexaStrike account has been suspended due to a violation of our community guidelines.</p>
                  
                  <div class="warning-box">
                    <strong>Reason for suspension:</strong><br>
                    ${banReason || 'Violation of community guidelines'}
                  </div>
                  
                  <p>This means you will no longer be able to:</p>
                  <ul>
                    <li>Log in to your account</li>
                    <li>Access any NexaStrike features</li>
                    <li>Submit new content</li>
                  </ul>
                  
                  <p>If you believe this suspension was made in error, please contact our support team.</p>
                  
                  <p>Best regards,<br><strong>The NexaStrike Moderation Team</strong></p>
                </div>
                
                <div class="footer">
                  <p>© 2026 NexaStrike. All rights reserved.</p>
                </div>
              </div>
            </body>
          </html>
        `,
      });

      console.log('Ban notification email sent to:', email);
      return response;
    } catch (error) {
      console.error('Error sending ban notification email:', error);
      return null;
    }
  },
};

module.exports = emailService;
