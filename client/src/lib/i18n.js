/**
 * Hindi and English, because that is who actually travels in Braj.
 *
 * Interface strings live here. Editorial content — tour itineraries, guide
 * bios, room features — comes from the database and is served as written;
 * translating that properly means storing both languages per row, which is a
 * content job rather than a code one.
 */

import { INDIAN_LANGUAGES } from './i18n-india.js';

/**
 * English, Hindi, and the other 21 languages of the Eighth Schedule.
 * English and Hindi carry the full interface; the rest carry the core set
 * and fall back to English for the remainder.
 */
export const LANGUAGES = [
  { code: 'en', label: 'English', native: 'English', dir: 'ltr', full: true },
  { code: 'hi', label: 'Hindi', native: 'हिन्दी', dir: 'ltr', full: true },
  ...INDIAN_LANGUAGES.map(({ dict, ...meta }) => ({ ...meta, full: false })),
];

export const DEFAULT_LANG = 'en';
export const STORAGE_KEY = 'jmd.lang';

const en = {
  // --- chrome ------------------------------------------------------------
  'nav.home': 'Home',
  'nav.buses': 'Buses',
  'nav.cars': 'Cars',
  'nav.bikes': 'Bikes',
  'nav.stays': 'Stays',
  'nav.tours': 'Tours',
  'nav.guides': 'Guides',
  'nav.myTrips': 'My Trips',
  'nav.signIn': 'Sign in',
  'nav.signOut': 'Sign out',
  'nav.whatsappUs': 'WhatsApp us',
  'nav.menu': 'Menu',
  'nav.more': 'More',

  // --- the three-dots menu ------------------------------------------------
  'menu.profile': 'Profile',
  'menu.language': 'Language',
  'menu.contact': 'Contact us',
  'menu.tracker': 'Live trip tracker',
  'menu.about': 'About us',

  // --- language dialog -----------------------------------------------------
  'lang.title': 'Choose your language',
  'lang.subtitle': 'We will remember it. You can change it any time from the menu.',
  'lang.continue': 'Continue',
  'lang.current': 'Current language',
  'lang.changed': 'Language changed',

  // --- shared --------------------------------------------------------------
  'common.loading': 'Loading',
  'common.back': 'Back',
  'common.close': 'Close',
  'common.cancel': 'Cancel',
  'common.continue': 'Continue',
  'common.tryAgain': 'Try again',
  'common.from': 'From',
  'common.to': 'To',
  'common.date': 'Date',
  'common.city': 'City',
  'common.optional': 'optional',
  'common.callUs': 'Call us',
  'common.whatsapp': 'WhatsApp',
  'common.headOffice': 'Head office',
  'common.controlRoom': 'Control room, 24×7',
  'common.since': 'Mathura since 1995',
  'common.wholeBus': 'Whole bus',
  'common.seats': 'seats',
  'common.people': 'people',
  'common.days': 'days',
  'common.nights': 'nights',

  // --- home ----------------------------------------------------------------
  'home.heroKicker': 'Mathura · Vrindavan · Barsana · Govardhan · Agra',
  'home.heroTitle': 'Hire the whole bus, straight from Mathura.',
  'home.heroBody':
    'is a Mathura operator, and we hire out whole buses — never single seats. Your group gets the vehicle, the driver and the route to itself, across Braj, Agra and the hills, with pickups all over Delhi and Noida.',
  'home.chip.whole': 'Whole bus, never shared',
  'home.chip.permit': 'All India Permit fleet',
  'home.chip.guides': 'Guides verified in person',
  'home.chip.tracking': 'Live tracking on every trip',
  'home.guidesTitle': 'Guides we have met in person',
  'home.guidesEyebrow': 'People, not a directory',
  'home.browseGuides': 'Browse guides',
  'home.reviewsTitle': 'What travellers said',
  'home.reviewsEyebrow': 'Verified trips only',
  'home.talkEyebrow': 'Talk to the office',
  'home.talkTitle': 'We quote every trip by hand.',
  'home.talkBody':
    'Season, group size and vehicle all move the number, so we do not publish a rate we would only have to walk back. Tell us your dates and how many of you there are — on WhatsApp, on the phone, or through the request form — and you get a straight answer from Mathura, usually within a couple of hours.',
  'home.trust1.t': 'Our office in Vrindavan',
  'home.trust1.d': 'Walk in behind Prem Mandir, on Sunrakh Road. A licensed transport operator running All India Permit buses, not a listings site.',
  'home.trust2.t': 'The whole bus, always',
  'home.trust2.d': 'We never sell single seats. You book the vehicle, so no stranger boards it — and the driver is named before you commit.',
  'home.trust3.t': 'Guides verified in person',
  'home.trust3.d': 'ID checked, references taken, and rated only by people who actually travelled.',
  'home.trust4.t': 'Control room, 24×7',
  'home.trust4.d': 'Live tracking on every trip, and a Mathura number that a person answers.',

  // --- search ---------------------------------------------------------------
  'search.groupSize': 'Group size',
  'search.findBus': 'Find a bus',
  'search.swap': 'Swap origin and destination',
  'search.pickDate': 'Pick a date',
  'search.filters': 'Filters',
  'search.sort': 'Sort',
  'search.vehicleType': 'Vehicle type',
  'search.departure': 'Departure',
  'search.clearFilters': 'Clear filters',
  'search.requestBus': 'Request this bus',
  'search.yoursAlone': 'whole bus, yours alone',
  'search.searching': 'Searching…',

  // --- request flow ----------------------------------------------------------
  'book.step1': 'Group details',
  'book.step2': 'Add-ons',
  'book.step3': 'Request sent',
  'book.leadTitle': 'Who is in charge of the group?',
  'book.leadName': 'Lead passenger name',
  'book.age': 'Age',
  'book.howMany': 'How many people are travelling?',
  'book.reachYou': 'Where do we reach you?',
  'book.mobile': 'Mobile (WhatsApp)',
  'book.email': 'Email',
  'book.boarding': 'Boarding point',
  'book.stationTitle': 'Railway station transfer',
  'book.stationBody':
    'Arriving by train? We will meet you at Mathura Junction and take you on from there, and get you back for your return train.',
  'book.stationPickup': 'Pick us up from Mathura Junction',
  'book.stationDrop': 'Drop us at Mathura Junction',
  'book.guideTitle': 'Add a local guide',
  'book.stayTitle': 'Stay and meals',
  'book.notesTitle': 'Anything else we should know?',
  'book.send': 'Send this request',
  'book.sending': 'Sending…',
  'book.noPayment': 'No payment now, and nothing is held until you accept our quote.',
  'book.nextTitle': 'What happens next',
  'book.next1': 'You send this request — nothing is charged.',
  'book.next2': 'Our Mathura office quotes you on WhatsApp.',
  'book.next3': 'Accept, and we hold the vehicle and issue your ticket.',

  // --- statuses ---------------------------------------------------------------
  'status.new': 'Awaiting quote',
  'status.quoted': 'Quote sent',
  'status.confirmed': 'Confirmed',
  'status.completed': 'Completed',
  'status.cancelled': 'Cancelled',

  // --- profile ------------------------------------------------------------------
  'profile.title': 'Your profile',
  'profile.name': 'Name',
  'profile.phone': 'Mobile',
  'profile.email': 'Email',
  'profile.points': 'Loyalty points',
  'profile.referral': 'Your referral code',
  'profile.referralBody': 'Share it. Points are earned every trip you take.',
  'profile.signedInAs': 'Signed in as',
  'profile.notSignedIn': 'You are not signed in',
  'profile.signInBody': 'Sign in to see your requests, tickets and loyalty points.',
  'profile.copied': 'Copied',

  // --- tracker --------------------------------------------------------------------
  'tracker.title': 'Live trip tracker',
  'tracker.body':
    'Follow a bus on the road. Anyone with the reference can watch it — no account needed, so send it to whoever is waiting at the other end.',
  'tracker.refLabel': 'Booking reference',
  'tracker.refHint': 'The code on your ticket, like JMD-AB12C34',
  'tracker.track': 'Track it',
  'tracker.yourTrips': 'Your trips on the road',
  'tracker.noneLive': 'None of your trips is moving right now.',
  'tracker.notFound': 'We could not find a confirmed trip with that reference.',

  // --- contact ----------------------------------------------------------------------
  'contact.title': 'Contact us',
  'contact.body':
    'A person answers, in Mathura, at any hour. Both lines are on WhatsApp if that is easier.',
  'contact.office': 'Walk in',
  'contact.officeBody': 'We are behind Prem Mandir on Sunrakh Road, near Hare Krishna Orchid — a few minutes from the Vrindavan parikrama marg.',
  'contact.hours': 'Office hours',
  'contact.hoursBody': 'Counter open 07:00 to 21:00 daily. The control room answers 24×7 during trips.',

  // --- about ------------------------------------------------------------------------
  'about.title': 'About us',
  'about.lead':
    'We are a bus and tourism operator based in Mathura, running our own vehicles across Braj, Agra and the hills since 1995.',
  'about.p1':
    'We are not a booking aggregator. The buses are on our own permit, the drivers are on our payroll, and the guides are people who have walked into our office with their documents. When something goes wrong on the road, the number you call is ours, and the person who answers can actually move a vehicle.',
  'about.p2':
    'We hire out whole vehicles rather than single seats. Your group gets the bus to itself — no strangers boarding at the next stop, and the driver named before you commit to anything.',
  'about.p3':
    'We do not publish rates. Season, group size and vehicle move the number far too much for a price list to be honest, so every trip is quoted by hand from the Mathura office, usually within a couple of hours.',
  'about.factsTitle': 'The plain facts',
  'about.fact.permit': 'All India Tourist Permit fleet',
  'about.fact.permitD': 'Licensed to cross state lines, which is what makes Agra, Rajasthan and the hill runs legal.',
  'about.fact.base': 'Head office in Vrindavan',
  'about.fact.baseD': 'Behind Prem Mandir, Sunrakh Road — walk in and meet us.',
  'about.fact.since': 'Running since 1995',
  'about.fact.sinceD': 'Three decades on the Braj circuit, and the same yard.',
  'about.fact.control': 'Control room, 24×7',
  'about.fact.controlD': 'Live tracking on every trip and a number a person answers.',
};

const hi = {
  'nav.home': 'होम',
  'nav.buses': 'बसें',
  'nav.cars': 'कारें',
  'nav.bikes': 'बाइक',
  'nav.stays': 'ठहरने की जगह',
  'nav.tours': 'यात्राएँ',
  'nav.guides': 'गाइड',
  'nav.myTrips': 'मेरी यात्राएँ',
  'nav.signIn': 'साइन इन',
  'nav.signOut': 'साइन आउट',
  'nav.whatsappUs': 'व्हाट्सएप करें',
  'nav.menu': 'मेन्यू',
  'nav.more': 'और',

  'menu.profile': 'प्रोफ़ाइल',
  'menu.language': 'भाषा',
  'menu.contact': 'संपर्क करें',
  'menu.tracker': 'लाइव ट्रिप ट्रैकर',
  'menu.about': 'हमारे बारे में',

  'lang.title': 'अपनी भाषा चुनें',
  'lang.subtitle': 'हम इसे याद रखेंगे। आप इसे कभी भी मेन्यू से बदल सकते हैं।',
  'lang.continue': 'आगे बढ़ें',
  'lang.current': 'मौजूदा भाषा',
  'lang.changed': 'भाषा बदल दी गई',

  'common.loading': 'लोड हो रहा है',
  'common.back': 'पीछे',
  'common.close': 'बंद करें',
  'common.cancel': 'रद्द करें',
  'common.continue': 'आगे बढ़ें',
  'common.tryAgain': 'फिर कोशिश करें',
  'common.from': 'कहाँ से',
  'common.to': 'कहाँ तक',
  'common.date': 'तारीख़',
  'common.city': 'शहर',
  'common.optional': 'वैकल्पिक',
  'common.callUs': 'फ़ोन करें',
  'common.whatsapp': 'व्हाट्सएप',
  'common.headOffice': 'मुख्य कार्यालय',
  'common.controlRoom': 'कंट्रोल रूम, 24×7',
  'common.since': 'मथुरा, 1995 से',
  'common.wholeBus': 'पूरी बस',
  'common.seats': 'सीटें',
  'common.people': 'लोग',
  'common.days': 'दिन',
  'common.nights': 'रातें',

  'home.heroKicker': 'मथुरा · वृंदावन · बरसाना · गोवर्धन · आगरा',
  'home.heroTitle': 'पूरी बस किराए पर लें, सीधे मथुरा से।',
  'home.heroBody':
    'मथुरा का अपना ऑपरेटर है, और हम पूरी बस किराए पर देते हैं — कभी अलग-अलग सीटें नहीं। गाड़ी, ड्राइवर और पूरा रास्ता सिर्फ़ आपके समूह का होता है — ब्रज, आगरा और पहाड़ों तक, दिल्ली और नोएडा से पिकअप के साथ।',
  'home.chip.whole': 'पूरी बस, कभी साझा नहीं',
  'home.chip.permit': 'ऑल इंडिया परमिट वाली गाड़ियाँ',
  'home.chip.guides': 'गाइड जिनसे हम ख़ुद मिले हैं',
  'home.chip.tracking': 'हर यात्रा पर लाइव ट्रैकिंग',
  'home.guidesTitle': 'गाइड जिनसे हम ख़ुद मिले हैं',
  'home.guidesEyebrow': 'लोग, कोई डायरेक्टरी नहीं',
  'home.browseGuides': 'सभी गाइड देखें',
  'home.reviewsTitle': 'यात्रियों ने क्या कहा',
  'home.reviewsEyebrow': 'सिर्फ़ पूरी हुई यात्राओं से',
  'home.talkEyebrow': 'कार्यालय से बात करें',
  'home.talkTitle': 'हम हर यात्रा का दाम ख़ुद तय करते हैं।',
  'home.talkBody':
    'मौसम, समूह का आकार और गाड़ी — तीनों दाम बदल देते हैं, इसलिए हम कोई ऐसी दर नहीं छापते जिससे बाद में पीछे हटना पड़े। अपनी तारीख़ें और कितने लोग हैं, यह बता दीजिए — व्हाट्सएप पर, फ़ोन पर, या फ़ॉर्म भरकर — और मथुरा से सीधा जवाब मिलेगा, आमतौर पर दो-तीन घंटे में।',
  'home.trust1.t': 'वृंदावन में हमारा कार्यालय',
  'home.trust1.d': 'प्रेम मंदिर के पीछे, सुनरख रोड पर — चलकर आइए। हम लाइसेंस वाले ट्रांसपोर्ट ऑपरेटर हैं, कोई लिस्टिंग साइट नहीं।',
  'home.trust2.t': 'हमेशा पूरी बस',
  'home.trust2.d': 'हम अलग सीटें नहीं बेचते। आप पूरी गाड़ी बुक करते हैं, इसलिए कोई अनजान नहीं चढ़ता — और ड्राइवर का नाम पहले ही बता दिया जाता है।',
  'home.trust3.t': 'गाइड जिनकी जाँच हुई है',
  'home.trust3.d': 'पहचान पत्र देखा गया, संदर्भ लिए गए, और रेटिंग सिर्फ़ उन्हीं से जो सच में यात्रा पर गए।',
  'home.trust4.t': 'कंट्रोल रूम, 24×7',
  'home.trust4.d': 'हर यात्रा पर लाइव ट्रैकिंग, और मथुरा का एक नंबर जिसे इंसान उठाता है।',

  'search.groupSize': 'कितने लोग',
  'search.findBus': 'बस खोजें',
  'search.swap': 'कहाँ से और कहाँ तक बदलें',
  'search.pickDate': 'तारीख़ चुनें',
  'search.filters': 'छाँटें',
  'search.sort': 'क्रम',
  'search.vehicleType': 'गाड़ी का प्रकार',
  'search.departure': 'रवानगी',
  'search.clearFilters': 'सब हटाएँ',
  'search.requestBus': 'यह बस माँगें',
  'search.yoursAlone': 'पूरी बस, सिर्फ़ आपकी',
  'search.searching': 'खोज रहे हैं…',

  'book.step1': 'समूह की जानकारी',
  'book.step2': 'अतिरिक्त सुविधाएँ',
  'book.step3': 'अनुरोध भेजा गया',
  'book.leadTitle': 'समूह का प्रमुख कौन है?',
  'book.leadName': 'मुख्य यात्री का नाम',
  'book.age': 'उम्र',
  'book.howMany': 'कितने लोग यात्रा कर रहे हैं?',
  'book.reachYou': 'हम आपसे कहाँ संपर्क करें?',
  'book.mobile': 'मोबाइल (व्हाट्सएप)',
  'book.email': 'ईमेल',
  'book.boarding': 'चढ़ने की जगह',
  'book.stationTitle': 'रेलवे स्टेशन से पिकअप और ड्रॉप',
  'book.stationBody':
    'ट्रेन से आ रहे हैं? हम आपको मथुरा जंक्शन पर लेने आएँगे और वापसी की ट्रेन के लिए समय पर स्टेशन पहुँचा देंगे।',
  'book.stationPickup': 'मथुरा जंक्शन से हमें लीजिए',
  'book.stationDrop': 'मथुरा जंक्शन पर छोड़िए',
  'book.guideTitle': 'स्थानीय गाइड जोड़ें',
  'book.stayTitle': 'ठहरना और भोजन',
  'book.notesTitle': 'और कुछ जो हमें जानना चाहिए?',
  'book.send': 'यह अनुरोध भेजें',
  'book.sending': 'भेजा जा रहा है…',
  'book.noPayment': 'अभी कोई भुगतान नहीं। जब तक आप हमारा दाम स्वीकार न करें, कुछ भी रोका नहीं जाता।',
  'book.nextTitle': 'आगे क्या होगा',
  'book.next1': 'आप यह अनुरोध भेजते हैं — कोई शुल्क नहीं लगता।',
  'book.next2': 'हमारा मथुरा कार्यालय आपको व्हाट्सएप पर दाम भेजता है।',
  'book.next3': 'आप हाँ कहें, और हम गाड़ी रोककर आपका टिकट बना देते हैं।',

  'status.new': 'दाम आना बाकी',
  'status.quoted': 'दाम भेजा गया',
  'status.confirmed': 'पक्का हुआ',
  'status.completed': 'पूरी हुई',
  'status.cancelled': 'रद्द',

  'profile.title': 'आपकी प्रोफ़ाइल',
  'profile.name': 'नाम',
  'profile.phone': 'मोबाइल',
  'profile.email': 'ईमेल',
  'profile.points': 'लॉयल्टी अंक',
  'profile.referral': 'आपका रेफ़रल कोड',
  'profile.referralBody': 'इसे साझा कीजिए। हर यात्रा पर अंक मिलते हैं।',
  'profile.signedInAs': 'साइन इन:',
  'profile.notSignedIn': 'आप साइन इन नहीं हैं',
  'profile.signInBody': 'अपने अनुरोध, टिकट और अंक देखने के लिए साइन इन कीजिए।',
  'profile.copied': 'कॉपी हो गया',

  'tracker.title': 'लाइव ट्रिप ट्रैकर',
  'tracker.body':
    'बस को रास्ते पर देखिए। जिसके पास रेफ़रेंस है वह देख सकता है — कोई खाता नहीं चाहिए, इसलिए इसे उन्हें भेज दीजिए जो दूसरी तरफ़ इंतज़ार कर रहे हैं।',
  'tracker.refLabel': 'बुकिंग रेफ़रेंस',
  'tracker.refHint': 'आपके टिकट पर लिखा कोड, जैसे JMD-AB12C34',
  'tracker.track': 'ट्रैक करें',
  'tracker.yourTrips': 'आपकी चल रही यात्राएँ',
  'tracker.noneLive': 'अभी आपकी कोई यात्रा रास्ते पर नहीं है।',
  'tracker.notFound': 'इस रेफ़रेंस से कोई पक्की यात्रा नहीं मिली।',

  'contact.title': 'संपर्क करें',
  'contact.body':
    'मथुरा में, किसी भी समय, एक इंसान फ़ोन उठाता है। दोनों नंबर व्हाट्सएप पर भी हैं।',
  'contact.office': 'चलकर आइए',
  'contact.officeBody': 'हम प्रेम मंदिर के पीछे सुनरख रोड पर हैं, हरे कृष्ण ऑर्किड के पास — वृंदावन परिक्रमा मार्ग से कुछ ही मिनट।',
  'contact.hours': 'कार्यालय का समय',
  'contact.hoursBody': 'काउंटर रोज़ 07:00 से 21:00 तक। यात्रा के दौरान कंट्रोल रूम 24×7 जवाब देता है।',

  'about.title': 'हमारे बारे में',
  'about.lead':
    'हम मथुरा के बस और पर्यटन ऑपरेटर हैं, 1995 से ब्रज, आगरा और पहाड़ों में अपनी गाड़ियाँ चला रहे हैं।',
  'about.p1':
    'हम कोई बुकिंग एग्रीगेटर नहीं हैं। बसें हमारे अपने परमिट पर हैं, ड्राइवर हमारे वेतन पर हैं, और गाइड वे लोग हैं जो अपने कागज़ लेकर हमारे दफ़्तर आए हैं। रास्ते में कुछ गड़बड़ हो तो जो नंबर आप मिलाते हैं वह हमारा है, और जो उठाता है वह सच में गाड़ी भेज सकता है।',
  'about.p2':
    'हम पूरी गाड़ी किराए पर देते हैं, अलग सीटें नहीं। बस सिर्फ़ आपके समूह की होती है — अगले स्टॉप पर कोई अनजान नहीं चढ़ता, और ड्राइवर का नाम पहले ही बता दिया जाता है।',
  'about.p3':
    'हम दरें नहीं छापते। मौसम, समूह और गाड़ी दाम इतना बदल देते हैं कि कोई भी रेट लिस्ट ईमानदार नहीं रहेगी, इसलिए हर यात्रा का दाम मथुरा कार्यालय से ख़ुद तय होता है — आमतौर पर दो-तीन घंटे में।',
  'about.factsTitle': 'सीधी बात',
  'about.fact.permit': 'ऑल इंडिया टूरिस्ट परमिट',
  'about.fact.permitD': 'राज्य की सीमा पार करने का लाइसेंस — इसी से आगरा, राजस्थान और पहाड़ की यात्राएँ वैध होती हैं।',
  'about.fact.base': 'वृंदावन में मुख्य कार्यालय',
  'about.fact.baseD': 'प्रेम मंदिर के पीछे, सुनरख रोड — आइए और मिलिए।',
  'about.fact.since': '1995 से चल रहे हैं',
  'about.fact.sinceD': 'ब्रज के रास्तों पर तीन दशक, और वही पुराना अड्डा।',
  'about.fact.control': 'कंट्रोल रूम, 24×7',
  'about.fact.controlD': 'हर यात्रा पर लाइव ट्रैकिंग और एक नंबर जिसे इंसान उठाता है।',
};

export const DICTIONARIES = {
  en,
  hi,
  ...Object.fromEntries(INDIAN_LANGUAGES.map((l) => [l.code, l.dict])),
};

/**
 * Look a key up, falling back to English and then to the key itself, so a
 * missing translation degrades to readable text rather than blank space.
 * Values in `vars` replace {placeholders}.
 */
export function translate(lang, key, vars) {
  const raw = DICTIONARIES[lang]?.[key] ?? DICTIONARIES[DEFAULT_LANG][key] ?? key;
  if (!vars) return raw;
  return raw.replace(/\{(\w+)\}/g, (m, name) => (name in vars ? String(vars[name]) : m));
}

export const readStoredLang = () => {
  try {
    const v = localStorage.getItem(STORAGE_KEY);
    return LANGUAGES.some((l) => l.code === v) ? v : null;
  } catch {
    return null;
  }
};

export const storeLang = (code) => {
  try { localStorage.setItem(STORAGE_KEY, code); } catch { /* private mode */ }
};
