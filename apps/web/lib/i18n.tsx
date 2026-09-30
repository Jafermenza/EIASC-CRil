'use client';

import { createContext, useContext, useEffect, useMemo, useState } from 'react';

export type Locale = 'en' | 'ar' | 'am' | 'om';
export const supportedLocales: { code: Locale; label: string; nativeLabel: string }[] = [
  { code: 'en', label: 'English', nativeLabel: 'English' },
  { code: 'ar', label: 'Arabic', nativeLabel: 'العربية' },
  { code: 'am', label: 'Amharic', nativeLabel: 'አማርኛ' },
  { code: 'om', label: 'Afan Oromo', nativeLabel: 'Afaan Oromoo' },
];

export const futureLocaleNote = 'The language catalog is designed so additional languages can be added without changing the application flow.';

type Dictionary = Record<string, string>;

const dictionaries: Record<Locale, Dictionary> = {
  en: {
    home: 'Home', services: 'Services', register: 'Register', track: 'Track', verify: 'Verify', about: 'About', signIn: 'Platform sign in',
    heroEyebrow: 'ETHIOPIAN ISLAMIC AFFAIRS SUPREME COUNCIL', heroTitle: 'A trusted digital home for members and Islamic institutions.',
    heroLead: 'Register with EIASC, follow your application, connect with your institution, receive your digital credential, and use trusted verification services — all in one place.',
    memberRegistration: 'Register as an individual', institutionRegistration: 'Register an institution', trackApplication: 'Track an application', verifyCredential: 'Verify a credential',
    servicesEyebrow: 'OUR SERVICES', servicesTitle: 'Simple services for people, institutions and administrators.',
    aboutEyebrow: 'ABOUT THE PLATFORM', aboutTitle: 'Connecting people, institutions and EIASC administration with one trusted system.',
    aboutText: 'EIASC CRil is designed to make registration and institutional services easier to understand and easier to access. It brings members, mosques, madrasas and Islamic institutions into a coordinated national registry while giving authorized administrators the information they need to serve their communities.',
    aboutFuture: 'The foundation is ready for future services such as membership dues, digital payments, Waqf and welfare services, education support, Hajj and Umrah services, reporting, mapping and national resource planning.',
    learnMore: 'Learn more', explore: 'Explore service',
    registrationTitle: 'Registration', registrationText: 'Apply for membership or register an Islamic institution through a clear step-by-step process.',
    licensingTitle: 'Institutional licensing', licensingText: 'Institutions can go through review and approval and receive an official digital operational certificate.',
    membershipTitle: 'Digital membership ID', membershipText: 'Approved members receive a digital membership ID that can be viewed, printed and checked when needed.',
    verificationTitle: 'QR verification', verificationText: 'Check an EIASC credential using its QR code or verification number.',
    communityTitle: 'Community connection', communityText: 'Connect members with their mosque, madrasa or Islamic institution and its responsible jurisdiction.',
    administrationTitle: 'Accountable administration', administrationText: 'Authorized officials can review applications, manage institutions, monitor members and produce reports.',
    journeyTitle: 'How it works', journey1: 'Register', journey2: 'Pay when required', journey3: 'Receive your tracking code', journey4: 'Follow the review', journey5: 'Receive your approved digital credential',
    institutionJourney: 'For institutions: apply → pay → review → inspection when required → approval → digital certificate → QR verification.',
    memberJourney: 'For individuals: register → pay when required → track → approval → membership ID → view or print your digital card.',
    footer: 'Community Registration & Institutional Licensing', language: 'Language', appearance: 'Appearance',
  },
  ar: {
    home: 'الرئيسية', services: 'الخدمات', register: 'التسجيل', track: 'متابعة الطلب', verify: 'التحقق', about: 'عن المنصة', signIn: 'تسجيل الدخول',
    heroEyebrow: 'المجلس الأعلى للشؤون الإسلامية الإثيوبي', heroTitle: 'منصة رقمية موثوقة للأعضاء والمؤسسات الإسلامية.',
    heroLead: 'سجّل لدى المجلس، تابع طلبك، ارتبط بمؤسستك، واحصل على هويتك الرقمية وخدمات التحقق الموثوقة من مكان واحد.',
    memberRegistration: 'تسجيل فرد', institutionRegistration: 'تسجيل مؤسسة', trackApplication: 'متابعة طلب', verifyCredential: 'التحقق من وثيقة',
    servicesEyebrow: 'خدماتنا', servicesTitle: 'خدمات بسيطة للأفراد والمؤسسات والإدارة.', aboutEyebrow: 'عن المنصة', aboutTitle: 'نربط الأفراد والمؤسسات وإدارة المجلس في نظام موثوق واحد.',
    aboutText: 'تم تصميم EIASC CRil لتسهيل التسجيل والخدمات المؤسسية. فهو يجمع الأعضاء والمساجد والمدارس الدينية والمؤسسات الإسلامية في سجل وطني منسق، مع تزويد المسؤولين المخولين بالمعلومات اللازمة لخدمة مجتمعاتهم.',
    aboutFuture: 'وتوفر المنصة أساساً لخدمات مستقبلية مثل رسوم العضوية، والمدفوعات الرقمية، والأوقاف والرعاية الاجتماعية، والتعليم، والحج والعمرة، والتقارير والخرائط والتخطيط الوطني للموارد.', learnMore: 'اعرف المزيد', explore: 'استكشف الخدمة',
    registrationTitle: 'التسجيل', registrationText: 'قدّم طلب العضوية أو سجّل مؤسسة إسلامية من خلال خطوات واضحة وبسيطة.', licensingTitle: 'ترخيص المؤسسات', licensingText: 'تمر المؤسسات بالمراجعة والاعتماد وتحصل على شهادة تشغيل رقمية رسمية.', membershipTitle: 'هوية العضوية الرقمية', membershipText: 'يحصل العضو المعتمد على هوية عضوية رقمية يمكن عرضها وطباعتها والتحقق منها.', verificationTitle: 'التحقق عبر QR', verificationText: 'تحقق من وثيقة المجلس باستخدام رمز QR أو رقم التحقق.', communityTitle: 'ربط المجتمع', communityText: 'ربط الأعضاء بمساجدهم أو مدارسهم أو مؤسساتهم الإسلامية والجهة الإدارية المسؤولة.', administrationTitle: 'إدارة مسؤولة', administrationText: 'يمكن للمسؤولين المخولين مراجعة الطلبات وإدارة المؤسسات ومتابعة الأعضاء وإعداد التقارير.',
    journeyTitle: 'كيف تعمل المنصة', journey1: 'التسجيل', journey2: 'الدفع عند الحاجة', journey3: 'استلام رمز المتابعة', journey4: 'متابعة المراجعة', journey5: 'استلام الوثيقة الرقمية المعتمدة', institutionJourney: 'للمؤسسات: تقديم الطلب ← الدفع ← المراجعة ← التفتيش عند الحاجة ← الاعتماد ← الشهادة الرقمية ← التحقق عبر QR.', memberJourney: 'للأفراد: التسجيل ← الدفع عند الحاجة ← المتابعة ← الاعتماد ← رقم العضوية ← عرض أو طباعة البطاقة الرقمية.', footer: 'التسجيل المجتمعي وترخيص المؤسسات الإسلامية', language: 'اللغة', appearance: 'المظهر',
  },
  am: {
    home: 'መነሻ', services: 'አገልግሎቶች', register: 'መመዝገብ', track: 'ማመልከቻ መከታተያ', verify: 'ማረጋገጫ', about: 'ስለ መድረኩ', signIn: 'ወደ መድረኩ ግባ',
    heroEyebrow: 'የኢትዮጵያ እስላማዊ ጉዳዮች ጠቅላይ ምክር ቤት', heroTitle: 'ለአባላትና ለእስላማዊ ተቋማት የታመነ ዲጂታል መድረክ።',
    heroLead: 'በምክር ቤቱ ይመዝገቡ፣ ማመልከቻዎን ይከታተሉ፣ ከተቋምዎ ጋር ይገናኙ፣ ዲጂታል መታወቂያዎን ይቀበሉ እና የታመኑ የማረጋገጫ አገልግሎቶችን በአንድ ቦታ ይጠቀሙ።',
    memberRegistration: 'የግል ምዝገባ', institutionRegistration: 'የተቋም ምዝገባ', trackApplication: 'ማመልከቻ ይከታተሉ', verifyCredential: 'ማረጋገጫ ይፈትሹ', servicesEyebrow: 'አገልግሎቶቻችን', servicesTitle: 'ለሰዎች፣ ለተቋማትና ለአስተዳደር ቀላል አገልግሎቶች።', aboutEyebrow: 'ስለ መድረኩ', aboutTitle: 'ሰዎችን፣ ተቋማትንና የምክር ቤቱን አስተዳደር በአንድ የታመነ ስርዓት ያገናኛል።',
    aboutText: 'EIASC CRil የምዝገባና የተቋማት አገልግሎቶችን ለመረዳትና ለመጠቀም ቀላል እንዲሆኑ የተዘጋጀ ነው። አባላትን፣ መስጊዶችን፣ መድረሳዎችንና እስላማዊ ተቋማትን በተቀናጀ ብሔራዊ መዝገብ ያገናኛል።', aboutFuture: 'ይህ መሠረት ለወደፊት የአባልነት ክፍያ፣ ዲጂታል ክፍያ፣ ዋቅፍና ማህበራዊ ድጋፍ፣ ትምህርት፣ ሐጅና ዑምራ፣ ሪፖርት፣ ካርታና የሀገር አቀፍ ሀብት እቅድ አገልግሎቶች መሠረት ይሆናል።', learnMore: 'ተጨማሪ ይወቁ', explore: 'አገልግሎቱን ይመልከቱ',
    registrationTitle: 'ምዝገባ', registrationText: 'የአባልነት ማመልከቻ ወይም የእስላማዊ ተቋም ምዝገባን በግልጽ ደረጃዎች ያከናውኑ።', licensingTitle: 'የተቋም ፈቃድ', licensingText: 'ተቋማት የግምገማና የማጽደቅ ሂደትን አልፈው ይፋዊ ዲጂታል የሥራ ማረጋገጫ ያገኛሉ።', membershipTitle: 'ዲጂታል የአባልነት መታወቂያ', membershipText: 'የተፈቀደላቸው አባላት ሊያዩት፣ ሊያትሙትና ሊያረጋግጡት የሚችሉ ዲጂታል መታወቂያ ያገኛሉ።', verificationTitle: 'QR ማረጋገጫ', verificationText: 'QR ኮድ ወይም የማረጋገጫ ቁጥር በመጠቀም የምክር ቤቱን ማረጋገጫ ይፈትሹ።', communityTitle: 'የማህበረሰብ ግንኙነት', communityText: 'አባላትን ከመስጊዳቸው፣ ከመድረሳቸው ወይም ከእስላማዊ ተቋማቸው እና ከኃላፊው አስተዳደር ጋር ያገናኛል።', administrationTitle: 'ተጠያቂ አስተዳደር', administrationText: 'የተፈቀደላቸው ኃላፊዎች ማመልከቻዎችን ይገመግማሉ፣ ተቋማትን ያስተዳድራሉ፣ አባላትን ይከታተላሉ እና ሪፖርት ያዘጋጃሉ።', journeyTitle: 'እንዴት ይሰራል?', journey1: 'ይመዝገቡ', journey2: 'ካስፈለገ ይክፈሉ', journey3: 'የመከታተያ ኮድ ይቀበሉ', journey4: 'ግምገማውን ይከታተሉ', journey5: 'የተፈቀደ ዲጂታል ማረጋገጫ ይቀበሉ', institutionJourney: 'ለተቋማት፦ ማመልከቻ → ክፍያ → ግምገማ → ካስፈለገ ቁጥጥር → ማጽደቅ → ዲጂታል ማረጋገጫ → QR ማረጋገጫ።', memberJourney: 'ለግለሰቦች፦ ምዝገባ → ካስፈለገ ክፍያ → መከታተል → ማጽደቅ → የአባልነት መታወቂያ → ዲጂታል ካርድ ማየት ወይም ማተም።', footer: 'የማህበረሰብ ምዝገባና የእስላማዊ ተቋማት ፈቃድ', language: 'ቋንቋ', appearance: 'ገጽታ',
  },
  om: {
    home: 'Fuula Jalqabaa', services: 'Tajaajiloota', register: 'Galmaa’i', track: 'Hordofi', verify: 'Mirkaneessi', about: 'Waa’ee keenya', signIn: 'Seeni',
    heroEyebrow: 'MANA MAREE DHIMMA ISLAAMAA OLAANAA ITOOPHIYAA', heroTitle: 'Waraabbii dijitaalaa amanamaa miseensotaa fi dhaabbilee Islaamaa.',
    heroLead: 'EIASC keessatti galmaa’i, iyyata kee hordofi, dhaabbata kee waliin wal qunnami, ragaa dijitaalaa kee argadhu, akkasumas tajaajila mirkaneessaa amanamaa bakka tokkotti fayyadami.',
    memberRegistration: 'Akka dhuunfaatti galmaa’i', institutionRegistration: 'Dhaabbata galmeessi', trackApplication: 'Iyyata hordofi', verifyCredential: 'Ragaa mirkaneessi', servicesEyebrow: 'TAJAAJILOTA KEENYA', servicesTitle: 'Tajaajiloota salphaa namoota, dhaabbilee fi bulchiinsaaf.', aboutEyebrow: 'WAA’EE PLATFOORMICHAA', aboutTitle: 'Namoota, dhaabbilee fi bulchiinsa EIASC sirna amanamaa tokko keessatti walitti hidha.',
    aboutText: 'EIASC CRil galmee fi tajaajila dhaabbilee salphaa fi hubatamaa gochuuf qophaa’e. Miseensota, masjiidota, madrasoota fi dhaabbilee Islaamaa galmee biyyaalessaa qindaa’aa keessatti walitti qaba; bulchitoota hayyamamaniif odeeffannoo isaan hawaasa isaanii tajaajiluuf barbaachisu ni kenna.', aboutFuture: 'Bu’uura kun kaffaltii miseensummaa, kaffaltii dijitaalaa, waqfii fi tajaajila hawaasummaa, barnoota, Hajjii fi Umraa, gabaasa, kaartaa fi karoora qabeenya biyyaalessaa gara fuulduraatti deeggera.', learnMore: 'Dabalata ilaali', explore: 'Tajaajila ilaali',
    registrationTitle: 'Galmee', registrationText: 'Miseensummaa gaafadhu ykn dhaabbata Islaamaa adeemsa ifaa fi tartiiba qabuun galmeessi.', licensingTitle: 'Hayyama dhaabbataa', licensingText: 'Dhaabbileen gamaaggama fi raggaasisa keessa darbuun ragaa hojii dijitaalaa mootummaa irraa argatu.', membershipTitle: 'Eenyummaa miseensummaa dijitaalaa', membershipText: 'Miseensonni ragga’an eenyummaa dijitaalaa ilaaluu, maxxansuu fi mirkaneessuu danda’u argatu.', verificationTitle: 'Mirkaneessa QR', verificationText: 'Koodii QR ykn lakkoofsa mirkaneessaa fayyadamuun ragaa EIASC mirkaneessi.', communityTitle: 'Walitti hidhamiinsa hawaasaa', communityText: 'Miseensota masjiida, madrasa ykn dhaabbata Islaamaa isaanii fi bulchiinsa itti gaafatamaa waliin wal qunnamsiisa.', administrationTitle: 'Bulchiinsa itti gaafatamaa', administrationText: 'Hoggantoonni hayyamaman iyyata gamaaggamu, dhaabbilee bulchu, miseensota hordofu fi gabaasa qopheessu danda’u.', journeyTitle: 'Akkamitti hojjeta?', journey1: 'Galmaa’i', journey2: 'Yoo barbaachise kaffali', journey3: 'Koodii hordoffii fudhadhu', journey4: 'Gamaaggama hordofi', journey5: 'Ragaa dijitaalaa ragga’e fudhadhu', institutionJourney: 'Dhaabbataaf: iyyata → kaffaltii → gamaaggama → yoo barbaachise sakatta’iinsa → raggaasisa → ragaa dijitaalaa → mirkaneessa QR.', memberJourney: 'Dhuunfaaf: galmee → yoo barbaachise kaffaltii → hordoffii → raggaasisa → lakkoofsa miseensummaa → kaardii dijitaalaa ilaali ykn maxxansi.', footer: 'Galmee Hawaasaa fi Hayyama Dhaabbilee Islaamaa', language: 'Afaan', appearance: 'Bifa',
  },
};

const I18nContext = createContext<{ locale: Locale; setLocale: (locale: Locale) => void; t: (key: string) => string }>({ locale: 'en', setLocale: () => undefined, t: key => dictionaries.en[key] ?? key });

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>('en');
  useEffect(() => { const saved = window.localStorage.getItem('eiasc-locale') as Locale | null; if (saved && dictionaries[saved]) setLocaleState(saved); }, []);
  const setLocale = (next: Locale) => { setLocaleState(next); window.localStorage.setItem('eiasc-locale', next); document.documentElement.lang = next; document.documentElement.dir = next === 'ar' ? 'rtl' : 'ltr'; };
  useEffect(() => { document.documentElement.lang = locale; document.documentElement.dir = locale === 'ar' ? 'rtl' : 'ltr'; }, [locale]);
  const value = useMemo(() => ({ locale, setLocale, t: (key: string) => dictionaries[locale][key] ?? dictionaries.en[key] ?? key }), [locale]);
  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n() { return useContext(I18nContext); }
