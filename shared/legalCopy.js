export const legalCopy = {
  fr: {
    privacyTitle: 'Politique de confidentialité',
    privacy: [
      {
        heading: 'Responsable du traitement',
        paragraphs: [
          'NexaStrike est le nom du service. L’identité juridique et les coordonnées de la personne ou de l’entité qui détermine les finalités et moyens des traitements doivent être renseignées par l’éditeur avant publication : [IDENTITÉ ET ADRESSE DU RESPONSABLE À COMPLÉTER].',
          'L’adresse ikitsue.contact@gmail.com est affichée dans le pied de page du site ; son fonctionnement et son responsable doivent être confirmés par l’éditeur.',
        ],
      },
      {
        heading: 'Données, finalités et bases légales',
        paragraphs: [
          'Compte : l’inscription transmet une adresse e-mail, un nom d’utilisateur et un mot de passe à Supabase Auth. Le mot de passe est traité par le service d’authentification, et n’est pas renvoyé par les requêtes de profil du site. Les fonctions de profil prévoient aussi un identifiant Steam et une image de profil, facultatifs lorsqu’ils ne sont pas renseignés. Ces données servent à créer et gérer le compte et à fournir les fonctions demandées (exécution du contrat, article 6(1)(b) du RGPD).',
          'Contenus communautaires : les suggestions et autres contenus soumis par un compte sont conservés dans la base Supabase et peuvent être visibles publiquement avec le nom d’utilisateur. Ils servent à afficher les cartes, points et contributions et à les modérer (service demandé ; sécurité et modération pouvant relever de l’intérêt légitime, article 6(1)(f)). N’incluez pas de données personnelles dans un contenu public.',
          'Protection contre les abus : les formulaires de connexion et d’inscription chargent hCaptcha. Lors d’une interaction, hCaptcha peut recevoir des données techniques et des données de l’appareil nécessaires à la détection des abus. Le site utilise cette vérification pour protéger l’authentification ; l’éditeur doit confirmer la base légale, les paramètres et les transferts associés.',
          'Mesure de performance : le composant Vercel Speed Insights est disponible dans le code du site, mais il ne se charge qu’après votre consentement facultatif. Les mesures techniques de performance sont utilisées pour comprendre les performances du site. Le consentement est révocable à tout moment depuis « Paramètres des cookies ».',
          'Vidéos YouTube sur le site web : certaines contributions contiennent des liens YouTube. Le lecteur intégré du site reste bloqué jusqu’à votre accord pour les médias externes ; YouTube peut alors recevoir des données de connexion et déposer/lire ses propres traceurs. Vous pouvez aussi ouvrir la vidéo directement sur YouTube. Aucun lecteur YouTube intégré n’a été identifié dans le code de l’application de bureau.',
          'Support : sur le site web, le formulaire transmet le sujet, le message, la catégorie, la priorité, l’e-mail et le nom facultatif au système de support hébergé dans Supabase. Si vous êtes connecté, le ticket est associé à votre compte ; un ticket invité peut être consulté après connexion à un compte ayant la même adresse e-mail vérifiée. hCaptcha vérifie les envois pour limiter les abus. L’équipe peut lire et répondre aux tickets sur le site ; cette fonction n’envoie pas de notification par e-mail. Dans l’application de bureau, le formulaire prépare un brouillon e-mail sur demande sans le transmettre ni le conserver.',
          'Données techniques : l’hébergement et les services d’authentification peuvent traiter des adresses IP, journaux de requêtes, identifiants de session et informations techniques pour fournir et sécuriser le service. Les durées exactes des journaux dépendent des paramètres et contrats des prestataires et doivent être confirmées par l’éditeur.',
        ],
      },
      {
        heading: 'Stockage, destinataires et transferts',
        paragraphs: [
          'Les profils, contenus, tickets, réponses aux tickets et sessions d’authentification sont traités par le projet Supabase associé au service (projet hébergé dans la région eu-west-1, selon la configuration vérifiée). Vercel fournit l’hébergement du site et, après consentement seulement, Speed Insights ; l’application de bureau peut également charger Speed Insights après ce choix. hCaptcha intervient sur les écrans d’authentification et d’envoi de tickets ; sur le site web, YouTube n’est contacté pour un lecteur intégré qu’après consentement.',
          'Le dépôt contient aussi un backend alternatif qui envoie des e-mails de bienvenue et de notification de bannissement via Resend lorsqu’il est configuré. Son déploiement effectif, les données envoyées, la région de traitement et les durées doivent être confirmés par l’éditeur. Le parcours d’inscription du site web observé utilise directement Supabase Auth et n’appelle pas ce backend.',
          'Les transferts hors Espace économique européen ne peuvent pas être déterminés uniquement à partir du code. L’éditeur doit vérifier les régions, contrats, sous-traitants ultérieurs et garanties de transfert de chaque service externe, notamment hCaptcha, Vercel, YouTube et, si utilisé, Resend.',
        ],
      },
      {
        heading: 'Durées de conservation et sécurité',
        paragraphs: [
          'Le code consulté ne définit pas de calendrier général de suppression automatique des comptes, profils ou contenus. L’éditeur doit fixer et appliquer des durées par finalité, y compris pour les journaux fournis par les prestataires. Les tickets et réponses du site web sont conservés dans Supabase jusqu’à leur suppression par un administrateur ; aucune suppression automatique n’est configurée. Le formulaire de bureau ne persiste pas le brouillon. Le choix de cookies facultatifs expire après six mois dans cette interface.',
          'Les contrôles d’accès et les règles de base de données limitent certaines opérations et protègent les données de compte. Aucun dispositif ne permet de garantir une sécurité absolue. Les demandes d’effacement de compte doivent être adressées au responsable tant qu’un parcours d’effacement en libre-service n’est pas proposé.',
        ],
      },
      {
        heading: 'Vos droits et contact',
        paragraphs: [
          'Selon les conditions prévues par le RGPD, vous pouvez demander l’accès, la rectification, l’effacement, la limitation, la portabilité ou vous opposer à certains traitements ; vous pouvez retirer un consentement à tout moment pour l’avenir. Contactez le responsable à l’adresse publiée sur le site, après confirmation par l’éditeur. Vous pouvez également introduire une réclamation auprès de la CNIL (cnil.fr).',
          'Le site ne comporte pas de fonctionnalité d’IA générative identifiée dans le code audité. Les contenus rédigés par les utilisateurs peuvent naturellement mentionner des outils d’IA.',
        ],
      },
      {
        heading: 'Cookies et technologies similaires',
        paragraphs: [
          'Aucun cookie HTTP du domaine du site n’a été observé dans le contrôle navigateur effectué ; le code utilise en revanche le stockage local du navigateur pour la langue, la session Supabase et le choix de confidentialité. hCaptcha peut utiliser des traceurs tiers sur les pages d’authentification et d’envoi de tickets. Les mesures Speed Insights et les lecteurs YouTube du site web sont désactivés avant consentement. L’application de bureau auditée ne contient pas de lecteur YouTube intégré.',
        ],
      },
    ],
  },
  en: {
    privacyTitle: 'Privacy policy',
    privacy: [
      {
        heading: 'Controller',
        paragraphs: [
          'NexaStrike is the service name. The legal identity and contact details of the person or entity determining the purposes and means of processing must be completed by the publisher before publication: [CONTROLLER IDENTITY AND ADDRESS TO BE COMPLETED].',
          'The site footer displays ikitsue.contact@gmail.com; the publisher must confirm that this address is operational and identify who controls it.',
        ],
      },
      {
        heading: 'Data, purposes and legal bases',
        paragraphs: [
          'Account: registration sends an email address, username and password to Supabase Auth. The password is handled by the authentication service and is not returned by the site’s profile queries. Profile features also support an optional Steam ID and profile image. These data are used to create and manage an account and provide requested features (contract performance, GDPR Article 6(1)(b)).',
          'Community content: suggestions and other account-submitted content are stored in the Supabase database and may be publicly visible with the username. They provide maps, points and contributions and allow moderation (requested service; security and moderation may rely on legitimate interests, Article 6(1)(f)). Do not include personal information in public content.',
          'Abuse prevention: login and registration forms load hCaptcha. During interaction, hCaptcha may receive technical and device data needed to detect abuse. The site uses the challenge to protect authentication; the publisher must confirm the legal basis, settings and related transfers.',
          'Performance measurement: Vercel Speed Insights is present in the site code but loads only after optional consent. Technical performance measurements help understand site performance. Consent can be withdrawn at any time through “Cookie settings”.',
          'Website YouTube videos: some contributions contain YouTube links. Embedded players on the website remain blocked until you consent to external media; YouTube may then receive connection data and use its own trackers. You may instead open a video directly on YouTube. No embedded YouTube player was identified in the desktop app code.',
          'Support: on the website, the form sends your subject, message, category, priority, email and optional name to the support system hosted in Supabase. If you are signed in, the ticket is linked to your account; a guest ticket can be viewed after signing in with an account that has the same verified email address. hCaptcha verifies ticket submissions to help prevent abuse. Support staff can read and reply to tickets in the site; no email notification is sent by this feature. In the desktop app, the contact form prepares an email draft on request; the app does not transmit or retain it. If you open and send that draft, your email client and its providers process the message.',
          'Technical data: hosting and authentication services may process IP addresses, request logs, session identifiers and technical information to provide and secure the service. Exact log retention depends on provider settings and contracts and must be confirmed by the publisher.',
        ],
      },
      {
        heading: 'Storage, recipients and transfers',
        paragraphs: [
          'Profiles, content, support tickets, ticket replies and authentication sessions are processed by the Supabase project used by the service (configured in eu-west-1, according to the project settings reviewed). Vercel hosts the site and provides Speed Insights only after consent; the desktop app may also load Speed Insights after that choice. hCaptcha is used on authentication and support submission screens; on the website, YouTube is contacted for embedded players only after consent.',
          'The repository also contains an alternative backend that sends welcome and ban-notification emails through Resend when configured. Its deployment, data sent, processing region and retention must be confirmed by the publisher. The observed website registration flow calls Supabase Auth directly and does not call this backend.',
          'Transfers outside the European Economic Area cannot be established from the code alone. The publisher must review regions, contracts, subprocessors and transfer safeguards for each external service, especially hCaptcha, Vercel, YouTube and Resend if used.',
        ],
      },
      {
        heading: 'Retention and security',
        paragraphs: [
          'The reviewed code does not define a general automatic deletion schedule for accounts, profiles or content. The publisher must define and enforce periods by purpose, including provider logs. Website tickets and replies remain in Supabase until an administrator deletes the ticket; no automatic ticket deletion is configured. The desktop form does not persist its draft. Optional cookie choices expire after six months in this interface.',
          'Access controls and database policies restrict some operations and protect account data. No system can guarantee absolute security. Until self-service account deletion is available, contact the controller to request account erasure.',
        ],
      },
      {
        heading: 'Your rights and contact',
        paragraphs: [
          'Subject to GDPR conditions, you may request access, rectification, erasure, restriction or portability, object to certain processing, and withdraw consent at any time for the future. Contact the controller using the address published on the site once confirmed by the publisher. You may also lodge a complaint with the French CNIL (cnil.fr).',
          'No generative AI feature was identified in the audited code. User-submitted content may, of course, mention AI tools.',
        ],
      },
      {
        heading: 'Cookies and similar technologies',
        paragraphs: [
          'No first-party HTTP cookie was observed during the browser check; the code does use browser local storage for language, the Supabase session and privacy choices. hCaptcha may use third-party trackers on authentication and support submission pages. Speed Insights and YouTube players are disabled until consent.',
        ],
      },
    ],
  },
  ru: {
    privacyTitle: 'Политика конфиденциальности',
    privacy: [
      { heading: 'Оператор персональных данных', paragraphs: [
        'NexaStrike — название сервиса. Издатель должен до публикации указать юридическое имя и контактные данные лица или организации, определяющих цели и способы обработки: [УКАЖИТЕ ИМЯ И АДРЕС ОПЕРАТОРА].',
        'В нижней части сайта указан адрес ikitsue.contact@gmail.com; издателю необходимо подтвердить, что он работает, и указать ответственное за него лицо.',
      ] },
      { heading: 'Данные, цели и правовые основания', paragraphs: [
        'Учётная запись: при регистрации Supabase Auth получает адрес электронной почты, имя пользователя и пароль. Пароль обрабатывается службой аутентификации и не возвращается в запросах профиля. Профиль также может содержать необязательные Steam ID и изображение. Эти данные используются для создания и управления учётной записью и предоставления запрошенных функций (исполнение договора, статья 6(1)(b) GDPR).',
        'Материалы сообщества: предложения и другие материалы, отправленные пользователем, хранятся в Supabase и могут отображаться публично вместе с именем пользователя. Не публикуйте персональные данные. Безопасность и модерация могут основываться на законном интересе, статья 6(1)(f) GDPR.',
        'Защита от злоупотреблений: на страницах входа и регистрации загружается hCaptcha. Сервис может получать технические данные и сведения об устройстве для выявления злоупотреблений. Издателю следует подтвердить правовое основание, настройки и условия передачи данных.',
        'Анализ производительности: Vercel Speed Insights загружается только после вашего согласия. Измерения помогают оценивать техническую производительность; согласие можно отозвать через настройки Cookie.',
        'Видео YouTube на сайте: некоторые материалы содержат ссылки YouTube. Встроенный проигрыватель сайта заблокирован до согласия на внешние медиа. После разрешения YouTube может получить данные подключения и использовать собственные средства отслеживания. Видео также можно открыть непосредственно на YouTube. В коде приложения для компьютера встроенный проигрыватель YouTube не обнаружен.',
        'Поддержка: сайт отправляет тему, сообщение, категорию, приоритет, электронную почту и указанное имя в систему поддержки Supabase. Если вы вошли в аккаунт, тикет связывается с ним; гостевой тикет можно посмотреть после входа в аккаунт с тем же подтверждённым адресом электронной почты. hCaptcha проверяет отправку для защиты от злоупотреблений. Сотрудники поддержки могут читать тикеты и отвечать на сайте; эта функция не отправляет уведомления по электронной почте. В приложении для компьютера форма лишь подготавливает черновик письма и не отправляет и не сохраняет его.',
        'Технические данные: хостинг и служба аутентификации могут обрабатывать IP-адреса, журналы запросов, идентификаторы сессий и техническую информацию. Сроки хранения журналов необходимо уточнить у поставщиков.',
      ] },
      { heading: 'Хранение, получатели и передача данных', paragraphs: [
        'Профили, материалы, тикеты поддержки, ответы на них и сессии аутентификации обрабатываются проектом Supabase в регионе eu-west-1 согласно проверенным настройкам. Vercel предоставляет хостинг сайта и загружает Speed Insights только после согласия; приложение для компьютера также может загрузить Speed Insights после такого выбора. hCaptcha используется на страницах аутентификации и отправки обращений; сайт обращается к YouTube для встроенных проигрывателей только после согласия.',
        'В репозитории есть альтернативный сервер, который при настройке отправляет через Resend приветственные письма и уведомления о блокировке. Издателю нужно подтвердить, развёрнут ли он, какие данные передаются, регион обработки и сроки хранения. Проверенный сценарий регистрации сайта напрямую использует Supabase Auth.',
        'Код не позволяет определить, передаются ли данные за пределы Европейской экономической зоны. Издателю следует проверить регионы, договоры, субподрядчиков и гарантии передачи у hCaptcha, Vercel, YouTube и, если используется, Resend.',
      ] },
      { heading: 'Сроки хранения и безопасность', paragraphs: [
        'В проверенном коде не задан общий автоматический срок удаления учётных записей, профилей и материалов. Издателю необходимо установить и применять сроки для каждой цели и журналов поставщиков. Тикеты и ответы сайта хранятся в Supabase, пока администратор не удалит тикет; автоматическое удаление не настроено. Приложение для компьютера не сохраняет черновик. Выбор необязательных Cookie хранится шесть месяцев.',
        'Контроль доступа и правила базы данных ограничивают некоторые операции. Абсолютную безопасность гарантировать нельзя. Пока самостоятельное удаление учётной записи недоступно, обратитесь к ответственному лицу.',
      ] },
      { heading: 'Ваши права и контакты', paragraphs: [
        'При соблюдении условий GDPR вы можете запросить доступ, исправление, удаление, ограничение обработки или переносимость данных, возразить против некоторых видов обработки и отозвать согласие на будущее. Обратитесь к ответственному лицу по адресу, опубликованному на сайте после подтверждения издателем. Жалобу можно подать во французскую CNIL (cnil.fr).',
        'В проверенном коде не обнаружена функция генеративного ИИ.',
      ] },
      { heading: 'Cookie и аналогичные технологии', paragraphs: [
        'При проверке не обнаружены HTTP-Cookie сайта. Браузерное локальное хранилище используется для языка, сессии Supabase и выбора конфиденциальности. hCaptcha может использовать сторонние средства отслеживания на страницах входа и отправки тикетов. Speed Insights и встроенные проигрыватели YouTube на сайте отключены до согласия.',
      ] },
    ],
  },
  es: {
    privacyTitle: 'Política de privacidad',
    privacy: [
      { heading: 'Responsable del tratamiento', paragraphs: [
        'NexaStrike es el nombre del servicio. Antes de publicar esta política, el editor debe indicar la identidad jurídica y los datos de contacto de la persona o entidad que determina los fines y medios del tratamiento: [INDICAR IDENTIDAD Y DOMICILIO DEL RESPONSABLE].',
        'El pie de página muestra ikitsue.contact@gmail.com; el editor debe confirmar que funciona e identificar quién lo gestiona.',
      ] },
      { heading: 'Datos, fines y bases jurídicas', paragraphs: [
        'Cuenta: el registro transmite a Supabase Auth el correo electrónico, el nombre de usuario y la contraseña. La contraseña la gestiona el servicio de autenticación y no se devuelve en las consultas del perfil. El perfil también admite un Steam ID y una imagen, ambos opcionales. Se utilizan para crear y gestionar la cuenta y prestar las funciones solicitadas (ejecución del contrato, artículo 6(1)(b) del RGPD).',
        'Contenido de la comunidad: las sugerencias y otros contenidos enviados por una cuenta se almacenan en Supabase y pueden mostrarse públicamente junto al nombre de usuario. No incluyas datos personales. La seguridad y moderación pueden basarse en el interés legítimo, artículo 6(1)(f) del RGPD.',
        'Prevención de abusos: hCaptcha se carga en las páginas de inicio de sesión y registro. Puede recibir datos técnicos y del dispositivo para detectar abusos. El editor debe confirmar la base jurídica, los ajustes y las transferencias correspondientes.',
        'Medición del rendimiento: Vercel Speed Insights solo se carga después de tu consentimiento. Las mediciones ayudan a conocer el rendimiento técnico y puedes retirar el consentimiento desde la configuración de cookies.',
        'Vídeos de YouTube en el sitio web: algunas contribuciones incluyen enlaces de YouTube. El reproductor integrado queda bloqueado hasta que aceptes los medios externos. Después, YouTube puede recibir datos de conexión y utilizar sus propios rastreadores. También puedes abrir el vídeo directamente en YouTube. No se identificó ningún reproductor integrado de YouTube en la aplicación de escritorio.',
        'Soporte: en la web, el formulario envía el asunto, mensaje, categoría, prioridad, correo electrónico y nombre opcional al sistema de soporte alojado en Supabase. Si has iniciado sesión, el ticket queda vinculado a tu cuenta; puedes consultar un ticket de invitado al iniciar sesión con una cuenta que tenga el mismo correo verificado. hCaptcha verifica los envíos para ayudar a prevenir abusos. El equipo de soporte puede leer y responder a los tickets en el sitio; esta función no envía notificaciones por correo. La aplicación de escritorio solo prepara un borrador de correo y no lo envía ni lo conserva.',
        'Datos técnicos: los servicios de alojamiento y autenticación pueden tratar direcciones IP, registros de solicitudes, identificadores de sesión e información técnica. El editor debe confirmar los plazos de conservación con los proveedores.',
      ] },
      { heading: 'Almacenamiento, destinatarios y transferencias', paragraphs: [
        'Los perfiles, contenidos y sesiones de autenticación se procesan en el proyecto Supabase asociado, configurado en la región eu-west-1 según la configuración revisada. Vercel aloja el sitio y carga Speed Insights solo tras el consentimiento; la aplicación de escritorio también puede cargarlo después de esa elección. hCaptcha se utiliza en las pantallas de autenticación; el sitio solo contacta con YouTube para los reproductores integrados tras el consentimiento.',
        'El repositorio también incluye un servidor alternativo que, si se configura, envía correos de bienvenida y avisos de bloqueo mediante Resend. El editor debe confirmar si está desplegado, los datos que transmite, la región y los plazos. El registro web revisado usa directamente Supabase Auth.',
        'El código no permite determinar si hay transferencias fuera del Espacio Económico Europeo. El editor debe revisar las regiones, contratos, subencargados y garantías de hCaptcha, Vercel, YouTube y, si se utiliza, Resend.',
      ] },
      { heading: 'Conservación y seguridad', paragraphs: [
        'El código revisado no establece plazos generales de eliminación automática de cuentas, perfiles o contenidos. El editor debe definir y aplicar plazos por finalidad, incluidos los registros de los proveedores. Los tickets y las respuestas de la web permanecen en Supabase hasta que un administrador los elimina; no hay eliminación automática configurada. La aplicación de escritorio no conserva borradores. La elección de cookies opcionales se conserva durante seis meses.',
        'Los controles de acceso y las reglas de la base de datos limitan algunas operaciones. No se puede garantizar una seguridad absoluta. Mientras no exista una opción de eliminación autónoma, contacta con el responsable para solicitarla.',
      ] },
      { heading: 'Tus derechos y contacto', paragraphs: [
        'Conforme a las condiciones del RGPD, puedes solicitar acceso, rectificación, supresión, limitación o portabilidad, oponerte a determinados tratamientos y retirar el consentimiento para el futuro. Contacta con el responsable mediante la dirección publicada en el sitio una vez confirmada por el editor. También puedes presentar una reclamación ante la CNIL francesa (cnil.fr).',
        'En el código revisado no se identificó ninguna función de IA generativa.',
      ] },
      { heading: 'Cookies y tecnologías similares', paragraphs: [
        'Durante la comprobación no se observaron cookies HTTP del sitio. El almacenamiento local del navegador se utiliza para el idioma, la sesión de Supabase y las preferencias de privacidad. hCaptcha puede usar rastreadores de terceros en las páginas de autenticación y envío de tickets. Speed Insights y los reproductores integrados de YouTube de la web permanecen desactivados hasta que se dé el consentimiento.',
      ] },
    ],
  },
  zh: {
    privacyTitle: '隐私政策',
    privacy: [
      { heading: '个人信息处理负责人', paragraphs: [
        'NexaStrike 是服务名称。发布者须在发布前补充决定处理目的和方式的个人或机构的法定身份及联系方式：[请填写负责人身份和地址]。',
        '网站页脚显示 ikitsue.contact@gmail.com；发布者须确认该邮箱有效并说明其负责人。',
      ] },
      { heading: '数据、目的和法律依据', paragraphs: [
        '账户：注册时，电子邮箱、用户名和密码会发送至 Supabase Auth。密码由身份验证服务处理，不会通过网站的个人资料查询返回。个人资料还支持可选的 Steam ID 和头像。这些数据用于创建和管理账户并提供所请求的功能（履行合同，GDPR 第 6(1)(b) 条）。',
        '社区内容：账户提交的建议和其他内容存储在 Supabase 中，并可能与用户名一同公开显示。请勿提交个人信息。安全和审核可能依据合法利益（GDPR 第 6(1)(f) 条）。',
        '防止滥用：登录和注册页面会加载 hCaptcha。该服务可能接收用于识别滥用行为的技术数据和设备信息。发布者须确认法律依据、设置和相关数据传输。',
        '性能测量：只有在您同意后才会加载 Vercel Speed Insights。技术测量用于了解网站性能；您可以通过 Cookie 设置撤回同意。',
        '网站上的 YouTube 视频：部分用户内容包含 YouTube 链接。网站嵌入式播放器在您同意外部媒体前保持阻止。允许后，YouTube 可能接收连接数据并使用自己的跟踪技术。您也可以直接在 YouTube 打开视频。桌面应用代码中未发现嵌入式 YouTube 播放器。',
        '支持：网站表单会将主题、消息、类别、优先级、电子邮件和可选姓名发送至 Supabase 支持系统。登录后，工单会关联到账户；访客工单可在使用相同已验证邮箱的账户登录后查看。hCaptcha 会验证提交以帮助防止滥用。支持团队可以在网站上查看并回复工单；此功能不会发送电子邮件通知。桌面应用只会按需生成邮件草稿，不会发送或保存。',
        '技术数据：托管和身份验证服务可能处理 IP 地址、请求日志、会话标识符和技术信息。日志的具体保存期限须向服务商确认。',
      ] },
      { heading: '存储、接收方和数据传输', paragraphs: [
        '根据已检查的设置，个人资料、内容、支持工单、工单回复和身份验证会话由位于 eu-west-1 区域的 Supabase 项目处理。Vercel 托管网站，并仅在同意后加载 Speed Insights；桌面应用也可能在同意后加载该功能。身份验证和工单提交页面使用 hCaptcha；网站仅在同意后为嵌入播放器联系 YouTube。',
        '代码仓库还包含一个备用后端，配置后会通过 Resend 发送欢迎邮件和封禁通知。发布者须确认其是否已部署、发送的数据、处理区域和保存期限。已检查的网站注册流程直接使用 Supabase Auth。',
        '仅凭代码无法确定是否向欧洲经济区以外传输数据。发布者须核查 hCaptcha、Vercel、YouTube 以及（如有使用）Resend 的区域、合同、分处理方和传输保障。',
      ] },
      { heading: '保存期限和安全', paragraphs: [
        '已检查的代码没有规定账户、个人资料或内容的通用自动删除期限。发布者须按处理目的制定并执行期限，包括服务商日志。网站工单和回复会保留在 Supabase 中，直到管理员删除工单；目前未配置自动删除。桌面应用不保存邮件草稿。可选 Cookie 选择在本界面保存六个月。',
        '访问控制和数据库规则限制部分操作，但无法保证绝对安全。在提供自助删除账户功能前，请联系负责人申请删除。',
      ] },
      { heading: '您的权利和联系方式', paragraphs: [
        '在 GDPR 规定的条件下，您可以请求访问、更正、删除、限制处理或转移数据，可以反对某些处理，也可以撤回未来的同意。发布者确认后，请通过网站公布的地址联系负责人。您也可以向法国 CNIL（cnil.fr）投诉。',
        '已检查的代码中未发现生成式人工智能功能。',
      ] },
      { heading: 'Cookie 和类似技术', paragraphs: [
        '浏览器检查未发现本网站的 HTTP Cookie。浏览器本地存储用于保存语言、Supabase 会话和隐私选择。身份验证和工单提交页面上的 hCaptcha 可能使用第三方跟踪技术。网站的 Speed Insights 和 YouTube 嵌入播放器在同意前不会启用。',
      ] },
    ],
  },
};

export const termsCopy = {
  fr: {
    title: 'Conditions d’utilisation',
    sections: [
      ['Objet et service', 'NexaStrike propose un site et une application de bureau consacrés aux cartes et utilitaires de Counter-Strike 2, des contributions communautaires, un profil et des outils de consultation. Certaines fonctions nécessitent un compte.'],
      ['Compte', 'Vous devez fournir les informations demandées pour créer un compte et protéger vos identifiants. L’inscription web utilise Supabase Auth. Contactez le responsable indiqué dans les mentions légales si vous ne pouvez plus accéder à votre compte ou souhaitez demander sa suppression.'],
      ['Contenus de la communauté', 'Vous restez responsable des contenus que vous soumettez et devez disposer des droits nécessaires pour les publier. Les suggestions, commentaires et médias peuvent être visibles par les autres utilisateurs. Ne publiez pas de données personnelles ou de contenus portant atteinte aux droits d’autrui. Vous autorisez leur hébergement et affichage dans le seul cadre du fonctionnement du service ; cette autorisation prend fin lorsque le contenu est supprimé, sous réserve des copies techniques nécessaires.'],
      ['Usage et modération', 'N’utilisez pas le service pour contourner ses contrôles, perturber son fonctionnement, publier des contenus illicites ou porter atteinte aux autres utilisateurs. Les fonctions de modération permettent de traiter les contenus et comptes signalés ou présentant un risque ; toute restriction doit respecter les règles applicables.'],
      ['Disponibilité et évolution', 'Le service est fourni gratuitement dans le code actuellement audité ; aucun parcours de commande ou de paiement n’a été identifié. Des fonctions peuvent évoluer ou être temporairement indisponibles. Ces conditions ne limitent pas les droits que la loi rend impératifs.'],
      ['Propriété intellectuelle et tiers', 'Les droits sur le code et les éléments du service appartiennent à leurs titulaires respectifs. Les contenus d’utilisateurs et les services tiers restent soumis aux droits et conditions de leurs titulaires. NexaStrike n’indique pas être affilié à l’éditeur de Counter-Strike 2.'],
      ['Modification et contact', 'Les modifications des présentes conditions seront publiées sur cette page avec leur date de mise à jour. Pour toute question, contactez l’éditeur via les coordonnées figurant dans les mentions légales.'],
    ],
  },
  en: {
    title: 'Terms of use',
    sections: [
      ['Service', 'NexaStrike provides a website and desktop application about Counter-Strike 2 maps and utility lineups, community contributions, profiles and viewing tools. Some features require an account.'],
      ['Account', 'Provide the information requested to create an account and protect your credentials. Website registration uses Supabase Auth. Contact the controller in the legal notice if you cannot access your account or wish to request deletion.'],
      ['Community content', 'You remain responsible for submitted content and must have the rights needed to publish it. Suggestions, comments and media may be visible to other users. Do not publish personal data or content infringing others’ rights. You permit hosting and display only as needed to operate the service; this permission ends when content is deleted, subject to necessary technical copies.'],
      ['Use and moderation', 'Do not bypass controls, disrupt the service, publish unlawful content or harm other users. Moderation features allow handling reported content and accounts or risks; any restriction must comply with applicable law.'],
      ['Availability and changes', 'The code currently reviewed provides the service free of charge; no order or payment flow was identified. Features may change or be temporarily unavailable. These terms do not limit rights that cannot be excluded by law.'],
      ['Intellectual property and third parties', 'Rights in code and service elements belong to their respective owners. User content and third-party services remain subject to their owners’ rights and terms. NexaStrike does not claim affiliation with the publisher of Counter-Strike 2.'],
      ['Changes and contact', 'Changes to these terms will be published on this page with an updated date. For questions, contact the publisher using the details in the legal notice.'],
    ],
  },
  ru: {
    title: 'Условия использования',
    sections: [
      ['Сервис', 'NexaStrike предоставляет сайт и приложение для компьютера с картами и расстановками утилит Counter-Strike 2, материалами сообщества, профилями и инструментами просмотра. Для некоторых функций нужна учётная запись.'],
      ['Учётная запись', 'Укажите запрошенные данные для создания учётной записи и защищайте свои данные для входа. Регистрация на сайте использует Supabase Auth. Если вы потеряли доступ или хотите запросить удаление учётной записи, свяжитесь с ответственным лицом из юридической информации.'],
      ['Материалы сообщества', 'Вы отвечаете за отправленные материалы и должны иметь право их публиковать. Предложения, комментарии и медиа могут быть видны другим пользователям. Не публикуйте персональные данные и материалы, нарушающие права других лиц. Вы разрешаете размещать и показывать материалы только для работы сервиса; это разрешение прекращается после удаления материала, за исключением необходимых технических копий.'],
      ['Использование и модерация', 'Не обходите средства контроля, не нарушайте работу сервиса, не публикуйте незаконные материалы и не причиняйте вред другим пользователям. Инструменты модерации позволяют рассматривать жалобы и риски; ограничения должны соответствовать применимому законодательству.'],
      ['Доступность и изменения', 'Согласно проверенному коду, сервис предоставляется бесплатно; оформление заказов и оплата не обнаружены. Функции могут меняться или временно быть недоступны. Условия не ограничивают права, которые нельзя исключить законом.'],
      ['Интеллектуальная собственность и третьи лица', 'Права на код и элементы сервиса принадлежат соответствующим правообладателям. Материалы пользователей и сторонние сервисы регулируются условиями их владельцев. NexaStrike не заявляет о связи с издателем Counter-Strike 2.'],
      ['Изменения и связь', 'Изменения условий публикуются на этой странице с датой обновления. По вопросам обратитесь к издателю по контактам из юридической информации.'],
    ],
  },
  es: {
    title: 'Condiciones de uso',
    sections: [
      ['Servicio', 'NexaStrike ofrece un sitio web y una aplicación de escritorio sobre mapas y alineaciones de utilidades de Counter-Strike 2, aportaciones de la comunidad, perfiles y herramientas de consulta. Algunas funciones requieren una cuenta.'],
      ['Cuenta', 'Facilita los datos solicitados para crear una cuenta y protege tus credenciales. El registro web utiliza Supabase Auth. Si no puedes acceder o quieres solicitar la eliminación de tu cuenta, contacta con el responsable indicado en el aviso legal.'],
      ['Contenido de la comunidad', 'Eres responsable del contenido que envías y debes tener los derechos necesarios para publicarlo. Las sugerencias, comentarios y medios pueden ser visibles para otros usuarios. No publiques datos personales ni contenido que infrinja derechos ajenos. Permites alojar y mostrar el contenido únicamente para prestar el servicio; esta autorización termina al eliminarlo, salvo copias técnicas necesarias.'],
      ['Uso y moderación', 'No eludas los controles, interrumpas el servicio, publiques contenido ilegal ni perjudiques a otros usuarios. Las funciones de moderación permiten gestionar denuncias y riesgos; cualquier restricción debe respetar la legislación aplicable.'],
      ['Disponibilidad y cambios', 'El código revisado ofrece el servicio gratuitamente; no se identificó ningún proceso de pedido o pago. Las funciones pueden cambiar o no estar disponibles temporalmente. Estas condiciones no limitan derechos irrenunciables por ley.'],
      ['Propiedad intelectual y terceros', 'Los derechos sobre el código y los elementos del servicio pertenecen a sus respectivos titulares. El contenido de usuarios y los servicios de terceros se rigen por los derechos y condiciones de sus titulares. NexaStrike no afirma estar afiliado al editor de Counter-Strike 2.'],
      ['Cambios y contacto', 'Los cambios en estas condiciones se publicarán en esta página con la fecha de actualización. Para consultas, contacta con el editor mediante los datos del aviso legal.'],
    ],
  },
  zh: {
    title: '使用条款',
    sections: [
      ['服务', 'NexaStrike 提供与 Counter-Strike 2 地图和道具投掷点位有关的网站及桌面应用，包括社区投稿、个人资料和浏览工具。部分功能需要账户。'],
      ['账户', '请提供创建账户所需的信息并妥善保护登录凭据。网站注册使用 Supabase Auth。如果无法访问账户或希望申请删除，请通过法律声明中的联系方式联系负责人。'],
      ['社区内容', '您对提交的内容负责，并须拥有发布所需的权利。建议、评论和媒体可能对其他用户可见。请勿发布个人数据或侵犯他人权利的内容。您允许我们仅为运营服务而托管和展示内容；内容删除后该许可终止，但必要的技术副本除外。'],
      ['使用和审核', '请勿绕过安全控制、干扰服务、发布违法内容或损害其他用户。审核功能用于处理举报和风险；任何限制均须遵守适用法律。'],
      ['可用性和变更', '已检查的代码显示服务免费提供，未发现订单或付款流程。功能可能变更或暂时不可用。本条款不限制法律规定不可放弃的权利。'],
      ['知识产权和第三方', '代码及服务元素的权利归各自权利人所有。用户内容和第三方服务受其权利人条款约束。NexaStrike 不声称与 Counter-Strike 2 的发行商存在关联。'],
      ['变更和联系', '本条款的变更将连同更新日期发布在此页面。如有疑问，请通过法律声明中的联系方式联系发布者。'],
    ],
  },
};

export const legalNoticeCopy = {
  fr: {
    title: 'Mentions légales',
    sections: [
      ['Éditeur du site', 'Directeur ou directrice de la publication : ikitsue. E-mail : ikitsue.contact@gmail.com (adresse publiée dans le pied de page, à confirmer comme fonctionnelle).'],
      ['Hébergement', 'Le site est déployé sur Vercel (adresse publique : nexa-strike.vercel.app). L’entité juridique, l’adresse et les coordonnées d’hébergement actuellement applicables doivent être confirmées par l’éditeur dans son contrat Vercel. La base et l’authentification utilisent Supabase ; ce fournisseur n’est pas nécessairement l’hébergeur du site web.'],
      ['Données personnelles', 'Les informations sur les traitements, les prestataires et les droits des personnes figurent dans la politique de confidentialité. L’identité du responsable du traitement doit être complétée avant publication.'],
      ['Propriété intellectuelle', 'Les contenus et marques de tiers restent la propriété de leurs titulaires. Les crédits et le code source sont accessibles depuis la page Crédits.'],
    ],
  },
  en: {
    title: 'Legal notice',
    sections: [
      ['Publisher', 'Publication director: ikitsue. Email: ikitsue.contact@gmail.com (listed in the footer; confirm that it is active).'],
      ['Hosting', 'The site is deployed on Vercel (public address: nexa-strike.vercel.app). The hosting entity, address and contact details applicable to the publisher’s Vercel contract must be confirmed. The database and authentication use Supabase; this provider is not necessarily the website host.'],
      ['Personal data', 'Information about processing, providers and data-subject rights is available in the privacy policy. The controller identity must be completed before publication.'],
      ['Intellectual property', 'Third-party content and trademarks remain the property of their respective owners. Credits and source code are available from the Credits page.'],
    ],
  },
  ru: {
    title: 'Юридическая информация',
    sections: [
      ['Издатель сайта', 'Ответственный за публикацию: ikitsue. Электронная почта: ikitsue.contact@gmail.com (указан в нижней части сайта; необходимо подтвердить, что адрес работает).'],
      ['Хостинг', 'Сайт размещён на Vercel (публичный адрес: nexa-strike.vercel.app). Издателю следует подтвердить юридическое лицо, адрес и контакты хостинга по действующему договору Vercel. База данных и аутентификация используют Supabase; это не обязательно хостинг сайта.'],
      ['Персональные данные', 'Сведения об обработке, поставщиках и правах пользователей приведены в политике конфиденциальности. Личность оператора необходимо указать до публикации.'],
      ['Интеллектуальная собственность', 'Сторонние материалы и товарные знаки принадлежат соответствующим правообладателям. Кредиты и исходный код доступны на странице «Кредиты».'],
    ],
  },
  es: {
    title: 'Aviso legal',
    sections: [
      ['Editor del sitio', 'Director de publicación: ikitsue. Correo electrónico: ikitsue.contact@gmail.com (publicado en el pie de página; se debe confirmar que está operativo).'],
      ['Alojamiento', 'El sitio está desplegado en Vercel (dirección pública: nexa-strike.vercel.app). El editor debe confirmar la entidad, dirección y datos de contacto aplicables según su contrato con Vercel. La base de datos y la autenticación usan Supabase; este proveedor no tiene por qué ser el alojamiento web.'],
      ['Datos personales', 'La política de privacidad contiene información sobre el tratamiento, los proveedores y los derechos de las personas. La identidad del responsable debe completarse antes de publicar.'],
      ['Propiedad intelectual', 'El contenido y las marcas de terceros pertenecen a sus respectivos titulares. Los créditos y el código fuente están disponibles en la página de créditos.'],
    ],
  },
  zh: {
    title: '法律声明',
    sections: [
      ['网站发布者', '出版负责人：ikitsue。电子邮箱：ikitsue.contact@gmail.com（页脚所列；须确认该邮箱有效）。'],
      ['托管服务', '网站部署在 Vercel（公开地址：nexa-strike.vercel.app）。发布者须根据当前 Vercel 合同确认托管实体、地址和联系方式。数据库及身份验证使用 Supabase；该服务商不一定是网站托管商。'],
      ['个人数据', '有关处理活动、服务商和个人权利的信息请参阅隐私政策。发布前须补充个人信息处理负责人的身份。'],
      ['知识产权', '第三方内容和商标归各自权利人所有。致谢和源代码可在致谢页面查看。'],
    ],
  },
};
