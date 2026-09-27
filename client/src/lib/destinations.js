/**
 * Destination pages.
 *
 * These exist because someone searching "tourism services in Mathura" needs a
 * page that is actually about Mathura — a search engine has nothing to rank
 * if every route renders the same homepage. Each entry is written to answer
 * that question honestly: what we run there, what is worth seeing, and how
 * you get to it.
 */

export const DESTINATIONS = [
  {
    slug: 'mathura',
    city: 'Mathura',
    name: 'Mathura',
    scene: 'ghat',
    tagline: 'Krishna’s birthplace, and the town our buses run out of',
    metaTitle: 'Tourism services in Mathura — bus, car, bike and room booking',
    metaDescription:
      'Whole-bus charters, cars with drivers, scooter hire, rooms and verified guides in Mathura. Run by a licensed Mathura-district operator with All India Permit vehicles. Quote by WhatsApp within hours.',
    intro:
      'Mathura is where Krishna was born and where most Braj trips begin. The Janmasthan, Dwarkadhish and the Yamuna ghats sit within a few kilometres of each other, and the railway junction puts you an hour from Agra and three from Delhi.',
    weRun: [
      'Whole-bus charters from Delhi and Noida, and out to every Braj town',
      'Cars with our own drivers for temple rounds and the Agra day trip',
      'Scooters and motorcycles for getting round on your own',
      'Rooms near the station and on the parikrama route',
      'Verified local guides, including women guides for family groups',
      'Pickup and drop at Mathura Junction railway station',
    ],
    sites: [
      'Shri Krishna Janmasthan', 'Dwarkadhish Temple', 'Vishram Ghat evening aarti',
      'Bhuteshwar Mahadev', 'Rangeshwar Mahadev', 'Potara Kund',
      'Gita Mandir', 'Kans Qila', 'Government Museum',
    ],
    gettingThere: [
      ['Delhi', 'about 3 hours 30 minutes by road on the Yamuna Expressway'],
      ['Noida', 'about 3 hours 15 minutes via Jewar'],
      ['Agra', 'about 1 hour 30 minutes'],
      ['Vrindavan', 'about 25 minutes'],
    ],
  },
  {
    slug: 'vrindavan',
    city: 'Vrindavan',
    name: 'Vrindavan',
    scene: 'temple',
    tagline: 'Where our office is, and where the temples are thickest',
    metaTitle: 'Tourism services in Vrindavan — bus, car, scooter and stay booking',
    metaDescription:
      'Our office is behind Prem Mandir on Sunrakh Road. Whole-bus hire, cars with drivers, scooters, rooms and verified guides in Vrindavan, from a licensed operator running All India Permit vehicles.',
    intro:
      'Vrindavan has more temples per square kilometre than anywhere else in Braj, and lanes too narrow for most of them to be reached by car. Our office is here, behind Prem Mandir on Sunrakh Road, which is why we know which gate to use and when.',
    weRun: [
      'Whole-bus charters to and from Vrindavan',
      'Scooters and motorcycles, which are honestly the best way round the old lanes',
      'Cars with drivers for anyone who would rather not ride',
      'Rooms on the parikrama marg, walking distance to Prem Mandir and ISKCON',
      'Guides who walk the parikrama marg daily',
    ],
    sites: [
      'Shri Banke Bihari Temple', 'Shri Radha Raman Temple', 'Radha Damodar Temple',
      'Radha Vallabh Temple', 'Shri Govind Dev Ji Temple', 'Madan Mohan Temple',
      'Prem Mandir', 'ISKCON Krishna Balaram Mandir', 'Nidhivan', 'Seva Kunj',
      'Shri Rangji Temple', 'Gopeshwar Mahadev', 'Kesi Ghat',
    ],
    gettingThere: [
      ['Mathura', 'about 25 minutes'],
      ['Delhi', 'about 3 hours 45 minutes'],
      ['Agra', 'about 2 hours'],
    ],
  },
  {
    slug: 'gokul',
    city: 'Gokul',
    name: 'Gokul and Mahavan',
    scene: 'temple',
    tagline: 'Where he was actually raised',
    metaTitle: 'Gokul and Mahavan tours — bus and car hire from Mathura',
    metaDescription:
      'Day trips to Gokul, Mahavan, Raman Reti and Brahmand Ghat, plus Dauji at Baldeo. Whole-bus charter or a car with a driver, from a licensed Mathura-district operator.',
    intro:
      'Gokul sits across the Yamuna from Mathura, and it is where Krishna spent his childhood rather than his birth. Chaurasi Khamba at Mahavan, the sand at Raman Reti and the ghat where Yashoda saw the universe are all within a short drive.',
    weRun: [
      'Half-day and full-day trips from Mathura by coach or car',
      'Combined Gokul, Mahavan and Baldeo runs',
      'Guides who can tell you what happened where',
    ],
    sites: [
      'Gokulnath Temple', 'Chaurasi Khamba at Mahavan', 'Raman Reti',
      'Brahmand Ghat', 'Chintaharan Mahadev', 'Dauji Temple at Baldeo',
    ],
    gettingThere: [
      ['Mathura', 'about 30 minutes'],
      ['Vrindavan', 'about 45 minutes'],
    ],
  },
  {
    slug: 'barsana',
    city: 'Barsana',
    name: 'Barsana and Nandgaon',
    scene: 'hill',
    tagline: 'Radha’s hill, and Krishna’s village across the fields',
    metaTitle: 'Barsana and Nandgaon tours — bus and car booking from Mathura',
    metaDescription:
      'Trips to the Ladli Ji temple on Bhanugarh hill, Maan Mandir, Prem Sarovar and Nandgaon. Whole-bus charters, cars with drivers and guides who know the climb.',
    intro:
      'The Ladli Ji temple sits on Bhanugarh hill above Barsana, about 250 steps up, with a palki available for anyone who needs one. Nandgaon is eight kilometres on. Both are best started early, before the heat.',
    weRun: [
      'Day trips from Mathura by coach or car',
      'Guides used to family groups and women-only parties',
      'Holi-season charters, which need booking well ahead',
    ],
    sites: [
      'Shri Ladli Ji Temple (Radha Rani)', 'Maan Mandir', 'Kirti Mandir',
      'Prem Sarovar', 'Sankari Khor', 'Nand Baba Temple, Nandgaon',
      'Pavan Sarovar', 'Yashoda Kund',
    ],
    gettingThere: [
      ['Mathura', 'about 1 hour 30 minutes'],
      ['Vrindavan', 'about 1 hour 15 minutes'],
    ],
  },
  {
    slug: 'govardhan',
    city: 'Govardhan',
    name: 'Govardhan',
    scene: 'hill',
    tagline: 'The 21 km parikrama, with a vehicle shadowing you',
    metaTitle: 'Govardhan parikrama tours — bus, car and support vehicle',
    metaDescription:
      'Govardhan parikrama trips with a support vehicle alongside, plus Daan Ghati, Radha Kund, Kusum Sarovar and Mansi Ganga. Rooms on the parikrama route.',
    intro:
      'The Govardhan parikrama is twenty-one kilometres on foot, and groups usually start at 04:30 to finish before the sun is high. We send a support vehicle along the route with a seat for anyone who needs one.',
    weRun: [
      'Parikrama trips with a support vehicle the whole way',
      'Day trips from Mathura by coach or car',
      'Rooms at Daan Ghati, on the parikrama marg itself',
    ],
    sites: [
      'Daan Ghati Mandir', 'Mukharvind at Jatipura', 'Radha Kund and Shyam Kund',
      'Kusum Sarovar', 'Mansi Ganga', 'Haridev Ji Temple', 'Punchhari ka Lautha',
    ],
    gettingThere: [
      ['Mathura', 'about 45 minutes'],
      ['Vrindavan', 'about 1 hour'],
    ],
  },
  {
    slug: 'agra',
    city: 'Agra',
    name: 'Agra',
    scene: 'taj',
    tagline: 'The Taj at sunrise, and back for the evening aarti',
    metaTitle: 'Agra tours from Mathura — Taj Mahal day trip, bus and car booking',
    metaDescription:
      'Taj Mahal sunrise trips, Agra Fort and Fatehpur Sikri, by whole-bus charter or car with driver. Licensed Agra guides. Day trips from Mathura and Vrindavan, or multi-day circuits.',
    intro:
      'Agra is an hour and a half from Mathura, which makes the Taj a comfortable day trip rather than a separate holiday. We run to the gate for opening so you are inside for first light, before the crowd builds. The Taj is closed on Fridays.',
    weRun: [
      'Taj-at-sunrise day trips from Mathura and Vrindavan',
      'Whole-bus charters from Delhi and Noida',
      'Cars with drivers, and scooters in Taj Ganj',
      'Rooms in Taj Ganj, walking distance to the south gate',
      'Ministry-licensed Agra guides, including French and Urdu speakers',
    ],
    sites: [
      'Taj Mahal', 'Agra Fort', 'Itmad-ud-Daulah (the Baby Taj)',
      'Mehtab Bagh', 'Jama Masjid', 'Fatehpur Sikri', 'Buland Darwaza',
      'Sheikh Salim Chishti Dargah',
    ],
    gettingThere: [
      ['Mathura', 'about 1 hour 30 minutes'],
      ['Delhi', 'about 4 hours'],
      ['Fatehpur Sikri', 'about 1 hour'],
    ],
  },
  {
    slug: 'ayodhya',
    city: 'Ayodhya',
    name: 'Ayodhya',
    scene: 'temple',
    tagline: 'Ram Janmabhoomi, paired with Braj or Kashi',
    metaTitle: 'Ayodhya tours and bus booking — from Mathura, Delhi and Varanasi',
    metaDescription:
      'Whole-bus charters to Ayodhya from Mathura, Delhi and Varanasi for Ram Janmabhoomi, Hanuman Garhi and the Saryu ghats. Overnight sleeper coaches, our own drivers, All India Permit vehicles.',
    intro:
      'Ayodhya is a long haul from Braj — about 580 km, which we run overnight on a sleeper coach so the day is not lost to the road. Most groups pair it with Varanasi, which is only a few hours further on, rather than making the trip twice.',
    weRun: [
      'Overnight sleeper charters from Mathura and Delhi',
      'Shorter runs from Varanasi, about four and a half hours',
      'Whole-vehicle hire, so a yatra group travels together',
      'Custom multi-day circuits pairing Ayodhya with Kashi or Braj',
    ],
    sites: [
      'Ram Janmabhoomi Mandir', 'Hanuman Garhi', 'Kanak Bhawan',
      'Nageshwarnath Temple', 'Saryu ghats and evening aarti', 'Guptar Ghat',
    ],
    gettingThere: [
      ['Mathura', 'about 11 hours, run overnight'],
      ['Delhi', 'about 12 hours 30 minutes, run overnight'],
      ['Varanasi', 'about 4 hours 30 minutes'],
    ],
  },
  {
    slug: 'varanasi',
    city: 'Varanasi',
    name: 'Varanasi (Banaras)',
    scene: 'ghat',
    tagline: 'The ghats at dawn, and Sarnath eleven kilometres out',
    metaTitle: 'Varanasi tours and bus booking from Mathura, Agra and Delhi',
    metaDescription:
      'Whole-bus charters to Varanasi from Mathura, Agra and Delhi. Sunrise boat on the Ganga, Kashi Vishwanath, the Dashashwamedh aarti and Sarnath. Our own coaches and drivers.',
    intro:
      'Varanasi is an overnight run east from Agra. Groups usually arrive around dawn, take a boat from Assi Ghat while the light is still low, and keep the afternoon empty because the heat is real.',
    weRun: [
      'Overnight sleeper charters from Agra, Mathura and Delhi',
      'Sunrise boat arrangements from Assi Ghat',
      'Sarnath half-day trips',
      'Custom circuits pairing Kashi with Ayodhya or Braj',
    ],
    sites: [
      'Kashi Vishwanath Temple', 'Dashashwamedh Ghat aarti', 'Assi Ghat at sunrise',
      'Manikarnika Ghat', 'Sarnath and the Dhamek Stupa', 'Sarnath Museum',
    ],
    gettingThere: [
      ['Agra', 'about 11 hours, run overnight'],
      ['Mathura', 'about 12 hours 30 minutes, run overnight'],
      ['Ayodhya', 'about 4 hours 30 minutes'],
    ],
  },
  {
    slug: 'bharatpur',
    city: 'Bharatpur',
    name: 'Bharatpur and Deeg',
    scene: 'arch',
    tagline: 'The bird lake, and the palace with a monsoon roof',
    metaTitle: 'Bharatpur and Deeg tours — Keoladeo National Park, bus and car hire',
    metaDescription:
      'Keoladeo Ghana National Park by cycle-rickshaw at dawn, and the Deeg water palace. Whole-bus charters and cars with drivers from Mathura, Agra and Vrindavan.',
    intro:
      'Keoladeo is best entered at dawn by cycle-rickshaw — engines are not allowed inside, and the rickshaw-wallahs know every heronry. Deeg, an hour north, has a palace built with a roof that drums like monsoon rain over the water gardens.',
    weRun: [
      'Day trips from Agra, Mathura and Vrindavan',
      'Cycle-rickshaw safaris arranged inside the park',
      'Whole-bus charters, with the Rajasthan state permit covered',
    ],
    sites: [
      'Keoladeo Ghana National Park', 'Deeg Palace and Gopal Bhavan',
      'Deeg water gardens', 'Lohagarh Fort',
    ],
    gettingThere: [
      ['Agra', 'about 1 hour'],
      ['Mathura', 'about 1 hour 30 minutes'],
      ['Fatehpur Sikri', 'about 40 minutes'],
    ],
  },
];

export const findDestination = (slug) => DESTINATIONS.find((d) => d.slug === slug);
