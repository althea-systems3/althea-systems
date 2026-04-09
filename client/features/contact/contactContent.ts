export type ContactToolsLocaleContent = {
  badge: string
  responseTime: string
  sectionTitle: string
  sectionDescription: string
  contactMeLabel: string
  supportTopicsTitle: string
  supportTopics: string[]
  formTitle: string
  formDescription: string
  formEmailLabel: string
  formEmailPlaceholder: string
  formSubjectLabel: string
  formSubjectPlaceholder: string
  formMessageLabel: string
  formMessagePlaceholder: string
  formSubmitLabel: string
  formSubmittingLabel: string
  formSuccessMessage: string
  formErrorMessage: string
  formErrorHint: string
  validation: {
    emailRequired: string
    emailInvalid: string
    subjectRequired: string
    subjectTooLong: string
    messageRequired: string
    messageTooLong: string
  }
  chat: {
    title: string
    description: string
    openLabel: string
    closeLabel: string
    inputLabel: string
    inputPlaceholder: string
    sendLabel: string
    sendingLabel: string
    welcome: string
    askEmail: string
    askSubject: string
    networkError: string
    escalateLabel: string
    escalatingLabel: string
    escalationSuccess: string
    escalationError: string
    contactFormCta: string
    botTyping: string
    sessionLoading: string
    sessionAuthenticated: string
    sessionGuest: string
    transcriptTitle: string
    userLabel: string
    botLabel: string
  }
}

const FR_CONTACT_CONTENT: ContactToolsLocaleContent = {
  badge: "Support Althea Systems",
  responseTime: "Delai moyen de reponse : sous 24h ouvrables",
  sectionTitle: "Parlons de votre besoin",
  sectionDescription:
    "Utilisez le formulaire pour une demande detaillee, ou demarrez une conversation en temps reel avec notre assistant.",
  contactMeLabel: "Contact Me",
  supportTopicsTitle: "Sujets frequents",
  supportTopics: [
    "Suivi de commande et statut de livraison",
    "Assistance connexion et compte client",
    "Questions produits, disponibilites et devis",
    "Facturation et support commercial",
  ],
  formTitle: "Formulaire de contact",
  formDescription:
    "Tous les champs sont obligatoires. Votre demande sera transmise au backoffice support.",
  formEmailLabel: "Adresse e-mail",
  formEmailPlaceholder: "vous@entreprise.com",
  formSubjectLabel: "Sujet du message",
  formSubjectPlaceholder: "Ex: Probleme de livraison commande #AS-4821",
  formMessageLabel: "Message",
  formMessagePlaceholder:
    "Detaillez votre demande pour permettre a l equipe de vous repondre rapidement.",
  formSubmitLabel: "Envoyer",
  formSubmittingLabel: "Envoi en cours...",
  formSuccessMessage:
    "Votre message a bien ete envoye, nous vous contacterons sous peu.",
  formErrorMessage:
    "Une erreur est survenue pendant l envoi. Merci de reessayer.",
  formErrorHint: "Corrigez les champs signales puis reessayez.",
  validation: {
    emailRequired: "L adresse e-mail est obligatoire.",
    emailInvalid: "Veuillez saisir une adresse e-mail valide.",
    subjectRequired: "Le sujet est obligatoire.",
    subjectTooLong: "Le sujet est trop long (140 caracteres max).",
    messageRequired: "Le message est obligatoire.",
    messageTooLong: "Le message est trop long (4000 caracteres max).",
  },
  chat: {
    title: "Chatbot support",
    description:
      "Posez votre question en temps reel. Vous pouvez demander un transfert vers un agent humain.",
    openLabel: "Ouvrir le chatbot",
    closeLabel: "Fermer le chatbot",
    inputLabel: "Votre message",
    inputPlaceholder: "Ecrivez votre message...",
    sendLabel: "Envoyer",
    sendingLabel: "Envoi...",
    welcome:
      "Bonjour, je suis l assistant Althea. Je peux vous aider sur les questions frequentes.",
    askEmail:
      "Pour mieux vous aider, indiquez votre adresse e-mail (ex: nom@domaine.com).",
    askSubject: "Merci. Quel est le sujet principal de votre demande ?",
    networkError:
      "Impossible de joindre le service chatbot pour le moment. Vous pouvez utiliser le formulaire de contact.",
    escalateLabel: "Parler a un agent",
    escalatingLabel: "Transmission en cours...",
    escalationSuccess:
      "Votre demande a ete transmise a un agent humain. Nous revenons vers vous rapidement.",
    escalationError:
      "Le transfert vers un agent a echoue. Merci de reessayer ou d utiliser le formulaire.",
    contactFormCta: "Detaillez votre demande dans le formulaire",
    botTyping: "Le bot est en train de repondre...",
    sessionLoading: "Verification session...",
    sessionAuthenticated: "Session connectee",
    sessionGuest: "Session invite",
    transcriptTitle: "Conversation",
    userLabel: "Vous",
    botLabel: "Bot",
  },
}

const EN_CONTACT_CONTENT: ContactToolsLocaleContent = {
  badge: "Althea Systems Support",
  responseTime: "Average response time: within 24 business hours",
  sectionTitle: "Let us help you",
  sectionDescription:
    "Use the form for detailed requests, or start a real-time chat with our assistant.",
  contactMeLabel: "Contact Me",
  supportTopicsTitle: "Frequent topics",
  supportTopics: [
    "Order tracking and delivery status",
    "Sign-in and customer account assistance",
    "Product, availability, and quote questions",
    "Billing and sales support",
  ],
  formTitle: "Contact form",
  formDescription:
    "All fields are required. Your request is sent to the support backoffice.",
  formEmailLabel: "Email address",
  formEmailPlaceholder: "you@company.com",
  formSubjectLabel: "Message subject",
  formSubjectPlaceholder: "Example: Delivery issue order #AS-4821",
  formMessageLabel: "Message",
  formMessagePlaceholder:
    "Describe your request so our team can provide a faster answer.",
  formSubmitLabel: "Send",
  formSubmittingLabel: "Sending...",
  formSuccessMessage:
    "Your message has been sent successfully. We will contact you shortly.",
  formErrorMessage: "An error occurred while sending your message.",
  formErrorHint: "Please fix the highlighted fields and try again.",
  validation: {
    emailRequired: "Email is required.",
    emailInvalid: "Please enter a valid email address.",
    subjectRequired: "Subject is required.",
    subjectTooLong: "Subject is too long (max 140 chars).",
    messageRequired: "Message is required.",
    messageTooLong: "Message is too long (max 4000 chars).",
  },
  chat: {
    title: "Support chatbot",
    description:
      "Ask your question in real time. You can request transfer to a human agent.",
    openLabel: "Open chatbot",
    closeLabel: "Close chatbot",
    inputLabel: "Your message",
    inputPlaceholder: "Type your message...",
    sendLabel: "Send",
    sendingLabel: "Sending...",
    welcome:
      "Hello, I am Althea assistant. I can help with frequent support questions.",
    askEmail: "To help you better, please share your email address.",
    askSubject: "Thank you. What is the main topic of your request?",
    networkError:
      "Chatbot service is currently unavailable. You can still use the contact form.",
    escalateLabel: "Talk to an agent",
    escalatingLabel: "Transferring...",
    escalationSuccess:
      "Your request has been forwarded to a human agent. We will get back to you quickly.",
    escalationError:
      "Human transfer failed. Please retry or use the contact form.",
    contactFormCta: "Use the contact form for a detailed request",
    botTyping: "Bot is replying...",
    sessionLoading: "Checking session...",
    sessionAuthenticated: "Signed-in session",
    sessionGuest: "Guest session",
    transcriptTitle: "Conversation",
    userLabel: "You",
    botLabel: "Bot",
  },
}

const AR_CONTACT_CONTENT: ContactToolsLocaleContent = {
  badge: "دعم Althea Systems",
  responseTime: "متوسط وقت الاستجابة: خلال 24 ساعة عمل",
  sectionTitle: "دعنا نساعدك",
  sectionDescription:
    "استخدم النموذج للطلبات التفصيلية، أو ابدأ محادثة فورية مع مساعدنا.",
  contactMeLabel: "تواصل معي",
  supportTopicsTitle: "المواضيع الشائعة",
  supportTopics: [
    "تتبع الطلب وحالة التسليم",
    "المساعدة في تسجيل الدخول وحساب العميل",
    "أسئلة المنتجات والتوفر وطلبات الأسعار",
    "الفوترة والدعم التجاري",
  ],
  formTitle: "نموذج الاتصال",
  formDescription: "جميع الحقول مطلوبة. سيتم إرسال طلبك إلى فريق الدعم.",
  formEmailLabel: "البريد الإلكتروني",
  formEmailPlaceholder: "you@company.com",
  formSubjectLabel: "موضوع الرسالة",
  formSubjectPlaceholder: "مثال: مشكلة تسليم الطلب #AS-4821",
  formMessageLabel: "الرسالة",
  formMessagePlaceholder: "اشرح طلبك حتى يتمكن فريقنا من الرد بسرعة أكبر.",
  formSubmitLabel: "إرسال",
  formSubmittingLabel: "جارٍ الإرسال...",
  formSuccessMessage: "تم إرسال رسالتك بنجاح. سنتواصل معك قريبًا.",
  formErrorMessage: "حدث خطأ أثناء إرسال رسالتك.",
  formErrorHint: "يرجى تصحيح الحقول المميزة ثم إعادة المحاولة.",
  validation: {
    emailRequired: "البريد الإلكتروني مطلوب.",
    emailInvalid: "يرجى إدخال بريد إلكتروني صالح.",
    subjectRequired: "الموضوع مطلوب.",
    subjectTooLong: "الموضوع طويل جدًا (الحد الأقصى 140 حرفًا).",
    messageRequired: "الرسالة مطلوبة.",
    messageTooLong: "الرسالة طويلة جدًا (الحد الأقصى 4000 حرف).",
  },
  chat: {
    title: "روبوت الدعم",
    description: "اطرح سؤالك مباشرة. يمكنك طلب التحويل إلى وكيل بشري.",
    openLabel: "فتح روبوت الدردشة",
    closeLabel: "إغلاق روبوت الدردشة",
    inputLabel: "رسالتك",
    inputPlaceholder: "اكتب رسالتك...",
    sendLabel: "إرسال",
    sendingLabel: "جارٍ الإرسال...",
    welcome: "مرحبًا، أنا مساعد Althea. يمكنني مساعدتك في الأسئلة المتكررة.",
    askEmail: "لمساعدتك بشكل أفضل، يرجى مشاركة بريدك الإلكتروني.",
    askSubject: "شكرًا لك. ما الموضوع الرئيسي لطلبك؟",
    networkError:
      "خدمة الدردشة غير متاحة حاليًا. لا يزال بإمكانك استخدام نموذج الاتصال.",
    escalateLabel: "التحدث إلى وكيل",
    escalatingLabel: "جارٍ التحويل...",
    escalationSuccess: "تم تحويل طلبك إلى وكيل بشري. سنعود إليك سريعًا.",
    escalationError:
      "فشل التحويل إلى وكيل بشري. يرجى إعادة المحاولة أو استخدام نموذج الاتصال.",
    contactFormCta: "استخدم نموذج الاتصال لطلب مفصل",
    botTyping: "الروبوت يكتب ردًا...",
    sessionLoading: "جارٍ التحقق من الجلسة...",
    sessionAuthenticated: "جلسة مسجّل دخول",
    sessionGuest: "جلسة ضيف",
    transcriptTitle: "المحادثة",
    userLabel: "أنت",
    botLabel: "الروبوت",
  },
}

const ES_CONTACT_CONTENT: ContactToolsLocaleContent = {
  badge: "Soporte Althea Systems",
  responseTime: "Tiempo medio de respuesta: dentro de 24 horas laborables",
  sectionTitle: "Permitanos ayudarle",
  sectionDescription:
    "Use el formulario para solicitudes detalladas o inicie un chat en tiempo real con nuestro asistente.",
  contactMeLabel: "Contactarme",
  supportTopicsTitle: "Temas frecuentes",
  supportTopics: [
    "Seguimiento de pedidos y estado de entrega",
    "Ayuda de inicio de sesion y cuenta cliente",
    "Preguntas sobre productos, disponibilidad y presupuestos",
    "Facturacion y soporte comercial",
  ],
  formTitle: "Formulario de contacto",
  formDescription:
    "Todos los campos son obligatorios. Su solicitud se enviara al backoffice de soporte.",
  formEmailLabel: "Correo electronico",
  formEmailPlaceholder: "you@company.com",
  formSubjectLabel: "Asunto del mensaje",
  formSubjectPlaceholder: "Ejemplo: Problema de entrega pedido #AS-4821",
  formMessageLabel: "Mensaje",
  formMessagePlaceholder:
    "Describa su solicitud para que nuestro equipo pueda responder mas rapido.",
  formSubmitLabel: "Enviar",
  formSubmittingLabel: "Enviando...",
  formSuccessMessage:
    "Su mensaje se ha enviado correctamente. Le contactaremos pronto.",
  formErrorMessage: "Se produjo un error durante el envio de su mensaje.",
  formErrorHint: "Corrija los campos marcados e intentelo de nuevo.",
  validation: {
    emailRequired: "El correo electronico es obligatorio.",
    emailInvalid: "Introduzca un correo electronico valido.",
    subjectRequired: "El asunto es obligatorio.",
    subjectTooLong: "El asunto es demasiado largo (maximo 140 caracteres).",
    messageRequired: "El mensaje es obligatorio.",
    messageTooLong: "El mensaje es demasiado largo (maximo 4000 caracteres).",
  },
  chat: {
    title: "Chatbot de soporte",
    description:
      "Haga su pregunta en tiempo real. Puede solicitar transferencia a un agente humano.",
    openLabel: "Abrir chatbot",
    closeLabel: "Cerrar chatbot",
    inputLabel: "Su mensaje",
    inputPlaceholder: "Escriba su mensaje...",
    sendLabel: "Enviar",
    sendingLabel: "Enviando...",
    welcome:
      "Hola, soy el asistente de Althea. Puedo ayudarle con preguntas frecuentes.",
    askEmail: "Para ayudarle mejor, comparta su correo electronico.",
    askSubject: "Gracias. Cual es el tema principal de su solicitud?",
    networkError:
      "El servicio de chatbot no esta disponible por ahora. Aun puede usar el formulario de contacto.",
    escalateLabel: "Hablar con un agente",
    escalatingLabel: "Transfiriendo...",
    escalationSuccess:
      "Su solicitud se ha transferido a un agente humano. Le responderemos rapidamente.",
    escalationError:
      "La transferencia a un agente humano fallo. Intente de nuevo o use el formulario de contacto.",
    contactFormCta:
      "Use el formulario de contacto para una solicitud detallada",
    botTyping: "El bot esta respondiendo...",
    sessionLoading: "Verificando sesion...",
    sessionAuthenticated: "Sesion iniciada",
    sessionGuest: "Sesion de invitado",
    transcriptTitle: "Conversacion",
    userLabel: "Usted",
    botLabel: "Bot",
  },
}

const CONTACT_CONTENT_BY_LOCALE: Record<string, ContactToolsLocaleContent> = {
  fr: FR_CONTACT_CONTENT,
  en: EN_CONTACT_CONTENT,
  ar: AR_CONTACT_CONTENT,
  es: ES_CONTACT_CONTENT,
}

export function getContactToolsLocaleContent(
  locale: string,
): ContactToolsLocaleContent {
  return CONTACT_CONTENT_BY_LOCALE[locale] ?? FR_CONTACT_CONTENT
}
