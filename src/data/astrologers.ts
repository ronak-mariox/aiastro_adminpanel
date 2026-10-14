import type { Astrologer } from './types'

// Mock seed — replace with API data when the backend is connected.
export const astrologersSeed: Astrologer[] = [
  {
    "id": "AST2001",
    "code": "2024119872",
    "name": "Rahul Iyer",
    "phone": "+91 9579261983",
    "email": "astro.rahul@vedrashi.in",
    "gender": "Male",
    "experienceYears": 7,
    "languages": [
      "Tamil",
      "Telugu"
    ],
    "skills": [
      "Love",
      "Nadi"
    ],
    "pricing": {
      "chat": 15,
      "call": 35,
      "video": 25
    },
    "rating": 4.3,
    "reviews": 960,
    "sessions": 1045,
    "followers": 1065,
    "earnings": 274500,
    "walletBalance": 12775,
    "availability": "offline",
    "services": {
      "chat": true,
      "call": true,
      "video": true,
      "live": false
    },
    "status": "active",
    "kyc": "verified",
    "city": "Chennai",
    "joinedAt": "2026-01-09T16:30:00"
  },
  {
    "id": "AST2002",
    "code": "2024122070",
    "name": "Priya Iyer",
    "phone": "+91 9126045435",
    "email": "astro.priya@vedrashi.in",
    "gender": "Female",
    "experienceYears": 8,
    "languages": [
      "Telugu"
    ],
    "skills": [
      "KP Astrology",
      "Marriage",
      "Nadi",
      "Palmistry"
    ],
    "pricing": {
      "chat": 25,
      "call": 35,
      "video": 35
    },
    "rating": 4.9,
    "reviews": 384,
    "sessions": 162,
    "followers": 5019,
    "earnings": 867721,
    "walletBalance": 9916,
    "availability": "offline",
    "services": {
      "chat": true,
      "call": true,
      "video": true,
      "live": false
    },
    "status": "pending",
    "kyc": "pending",
    "city": "Chennai",
    "joinedAt": "2026-02-17T12:45:00"
  },
  {
    "id": "AST2003",
    "code": "2024108892",
    "name": "Suresh Mehta",
    "phone": "+91 9693343976",
    "email": "astro.suresh@vedrashi.in",
    "gender": "Male",
    "experienceYears": 18,
    "languages": [
      "English",
      "Telugu"
    ],
    "skills": [
      "Numerology",
      "Palmistry"
    ],
    "pricing": {
      "chat": 30,
      "call": 15,
      "video": 35
    },
    "rating": 3.9,
    "reviews": 1030,
    "sessions": 7343,
    "followers": 2887,
    "earnings": 250572,
    "walletBalance": 8711,
    "availability": "offline",
    "services": {
      "chat": true,
      "call": false,
      "video": true,
      "live": false
    },
    "status": "active",
    "kyc": "verified",
    "city": "Varanasi",
    "joinedAt": "2026-02-25T15:30:00"
  },
  {
    "id": "AST2004",
    "code": "2024125265",
    "name": "Dimple Kumar",
    "phone": "+91 9313878733",
    "email": "astro.dimple@vedrashi.in",
    "gender": "Female",
    "experienceYears": 15,
    "languages": [
      "English"
    ],
    "skills": [
      "Vastu",
      "Tarot"
    ],
    "pricing": {
      "chat": 20,
      "call": 45,
      "video": 35
    },
    "rating": 4.2,
    "reviews": 821,
    "sessions": 4143,
    "followers": 4079,
    "earnings": 536968,
    "walletBalance": 34492,
    "badge": "Celebrity",
    "availability": "offline",
    "services": {
      "chat": true,
      "call": true,
      "video": true,
      "live": true
    },
    "status": "active",
    "kyc": "verified",
    "city": "Bengaluru",
    "joinedAt": "2026-08-12T07:30:00"
  },
  {
    "id": "AST2005",
    "code": "2024124181",
    "name": "Amit Sharma",
    "phone": "+91 9180655823",
    "email": "astro.amit@vedrashi.in",
    "gender": "Male",
    "experienceYears": 12,
    "languages": [
      "English",
      "Telugu",
      "Tamil"
    ],
    "skills": [
      "Vedic",
      "Numerology",
      "Love",
      "Life Coach"
    ],
    "pricing": {
      "chat": 30,
      "call": 25,
      "video": 35
    },
    "rating": 3.8,
    "reviews": 706,
    "sessions": 2336,
    "followers": 773,
    "earnings": 218884,
    "walletBalance": 16706,
    "badge": "Rising Star",
    "availability": "offline",
    "services": {
      "chat": true,
      "call": false,
      "video": false,
      "live": false
    },
    "status": "active",
    "kyc": "verified",
    "city": "Ahmedabad",
    "joinedAt": "2026-06-06T15:00:00"
  },
  {
    "id": "AST2006",
    "code": "2024112036",
    "name": "Rahul Chandravanshi",
    "phone": "+91 9538269252",
    "email": "astro.rahul@vedrashi.in",
    "gender": "Male",
    "experienceYears": 4,
    "languages": [
      "Marathi",
      "Bengali"
    ],
    "skills": [
      "Love",
      "Prashna"
    ],
    "pricing": {
      "chat": 10,
      "call": 20,
      "video": 60
    },
    "rating": 4.6,
    "reviews": 849,
    "sessions": 4661,
    "followers": 5089,
    "earnings": 443142,
    "walletBalance": 3365,
    "badge": "Rising Star",
    "availability": "busy",
    "services": {
      "chat": true,
      "call": true,
      "video": true,
      "live": false
    },
    "status": "active",
    "kyc": "verified",
    "city": "Lucknow",
    "joinedAt": "2026-04-13T18:15:00"
  },
  {
    "id": "AST2007",
    "code": "2024107655",
    "name": "Rajesh Mehta",
    "phone": "+91 9720403365",
    "email": "astro.rajesh@vedrashi.in",
    "gender": "Male",
    "experienceYears": 12,
    "languages": [
      "English",
      "Marathi"
    ],
    "skills": [
      "Vedic",
      "Prashna"
    ],
    "pricing": {
      "chat": 15,
      "call": 35,
      "video": 25
    },
    "rating": 4.5,
    "reviews": 769,
    "sessions": 8285,
    "followers": 2862,
    "earnings": 157973,
    "walletBalance": 22802,
    "badge": "Rising Star",
    "availability": "online",
    "services": {
      "chat": true,
      "call": false,
      "video": true,
      "live": false
    },
    "status": "active",
    "kyc": "verified",
    "city": "Bengaluru",
    "joinedAt": "2026-05-05T07:45:00"
  },
  {
    "id": "AST2008",
    "code": "2024112413",
    "name": "Priya Deshmukh",
    "phone": "+91 9864837338",
    "email": "astro.priya@vedrashi.in",
    "gender": "Female",
    "experienceYears": 20,
    "languages": [
      "English",
      "Marathi",
      "Telugu"
    ],
    "skills": [
      "Health",
      "Vastu",
      "KP Astrology",
      "Tarot"
    ],
    "pricing": {
      "chat": 30,
      "call": 20,
      "video": 25
    },
    "rating": 4.3,
    "reviews": 1070,
    "sessions": 2583,
    "followers": 6334,
    "earnings": 381656,
    "walletBalance": 8064,
    "badge": "Rising Star",
    "availability": "offline",
    "services": {
      "chat": true,
      "call": true,
      "video": true,
      "live": false
    },
    "status": "suspended",
    "kyc": "pending",
    "city": "Varanasi",
    "joinedAt": "2026-01-22T16:00:00"
  },
  {
    "id": "AST2009",
    "code": "2024126017",
    "name": "Dimple Joshi",
    "phone": "+91 9796888357",
    "email": "astro.dimple@vedrashi.in",
    "gender": "Female",
    "experienceYears": 14,
    "languages": [
      "Bengali",
      "English"
    ],
    "skills": [
      "Nadi",
      "Love",
      "Face Reading"
    ],
    "pricing": {
      "chat": 25,
      "call": 45,
      "video": 60
    },
    "rating": 4.0,
    "reviews": 17,
    "sessions": 8039,
    "followers": 7673,
    "earnings": 251678,
    "walletBalance": 29282,
    "availability": "busy",
    "services": {
      "chat": true,
      "call": true,
      "video": false,
      "live": false
    },
    "status": "active",
    "kyc": "verified",
    "city": "Mumbai",
    "joinedAt": "2026-03-12T19:30:00"
  },
  {
    "id": "AST2010",
    "code": "2024121667",
    "name": "Anil Joshi",
    "phone": "+91 9143649358",
    "email": "astro.anil@vedrashi.in",
    "gender": "Male",
    "experienceYears": 21,
    "languages": [
      "Hindi"
    ],
    "skills": [
      "Face Reading",
      "Marriage",
      "Career",
      "Prashna"
    ],
    "pricing": {
      "chat": 10,
      "call": 15,
      "video": 60
    },
    "rating": 4.6,
    "reviews": 288,
    "sessions": 443,
    "followers": 1137,
    "earnings": 648955,
    "walletBalance": 7181,
    "badge": "Top Choice",
    "availability": "busy",
    "services": {
      "chat": true,
      "call": false,
      "video": false,
      "live": true
    },
    "status": "active",
    "kyc": "verified",
    "city": "Indore",
    "joinedAt": "2026-04-03T17:30:00"
  },
  {
    "id": "AST2011",
    "code": "2024113352",
    "name": "Arjun Saini",
    "phone": "+91 9372903727",
    "email": "astro.arjun@vedrashi.in",
    "gender": "Male",
    "experienceYears": 17,
    "languages": [
      "English",
      "Bengali"
    ],
    "skills": [
      "Life Coach",
      "Prashna",
      "Vastu"
    ],
    "pricing": {
      "chat": 20,
      "call": 25,
      "video": 25
    },
    "rating": 4.0,
    "reviews": 836,
    "sessions": 2661,
    "followers": 4607,
    "earnings": 717696,
    "walletBalance": 21484,
    "availability": "online",
    "services": {
      "chat": true,
      "call": true,
      "video": true,
      "live": false
    },
    "status": "active",
    "kyc": "verified",
    "city": "Pune",
    "joinedAt": "2026-06-28T20:00:00"
  },
  {
    "id": "AST2012",
    "code": "2024127086",
    "name": "Ayushi Rao",
    "phone": "+91 9384277575",
    "email": "astro.ayushi@vedrashi.in",
    "gender": "Female",
    "experienceYears": 13,
    "languages": [
      "Bengali",
      "English"
    ],
    "skills": [
      "Face Reading",
      "Marriage",
      "Numerology"
    ],
    "pricing": {
      "chat": 25,
      "call": 20,
      "video": 35
    },
    "rating": 4.5,
    "reviews": 108,
    "sessions": 4875,
    "followers": 8505,
    "earnings": 270973,
    "walletBalance": 20320,
    "availability": "offline",
    "services": {
      "chat": true,
      "call": false,
      "video": false,
      "live": false
    },
    "status": "pending",
    "kyc": "pending",
    "city": "Lucknow",
    "joinedAt": "2026-01-24T07:15:00"
  },
  {
    "id": "AST2013",
    "code": "2024119399",
    "name": "Vikram Deshmukh",
    "phone": "+91 9490948317",
    "email": "astro.vikram@vedrashi.in",
    "gender": "Male",
    "experienceYears": 2,
    "languages": [
      "Telugu"
    ],
    "skills": [
      "Life Coach",
      "Love"
    ],
    "pricing": {
      "chat": 10,
      "call": 15,
      "video": 25
    },
    "rating": 3.8,
    "reviews": 736,
    "sessions": 4996,
    "followers": 1792,
    "earnings": 553498,
    "walletBalance": 23406,
    "availability": "busy",
    "services": {
      "chat": true,
      "call": true,
      "video": false,
      "live": true
    },
    "status": "active",
    "kyc": "verified",
    "city": "Chennai",
    "joinedAt": "2026-08-06T10:00:00"
  },
  {
    "id": "AST2014",
    "code": "2024103370",
    "name": "Deepak Gupta",
    "phone": "+91 9814545669",
    "email": "astro.deepak@vedrashi.in",
    "gender": "Male",
    "experienceYears": 9,
    "languages": [
      "Tamil",
      "Hindi"
    ],
    "skills": [
      "Love",
      "Prashna"
    ],
    "pricing": {
      "chat": 20,
      "call": 45,
      "video": 60
    },
    "rating": 4.5,
    "reviews": 1070,
    "sessions": 8094,
    "followers": 4121,
    "earnings": 178119,
    "walletBalance": 26,
    "badge": "Rising Star",
    "availability": "online",
    "services": {
      "chat": true,
      "call": true,
      "video": true,
      "live": true
    },
    "status": "active",
    "kyc": "verified",
    "city": "Mumbai",
    "joinedAt": "2026-01-20T12:15:00"
  },
  {
    "id": "AST2015",
    "code": "2024127803",
    "name": "Neha Shah",
    "phone": "+91 9973360984",
    "email": "astro.neha@vedrashi.in",
    "gender": "Female",
    "experienceYears": 20,
    "languages": [
      "Bengali"
    ],
    "skills": [
      "Numerology",
      "Palmistry",
      "Love"
    ],
    "pricing": {
      "chat": 10,
      "call": 35,
      "video": 25
    },
    "rating": 4.3,
    "reviews": 904,
    "sessions": 7642,
    "followers": 1368,
    "earnings": 782786,
    "walletBalance": 29654,
    "badge": "Celebrity",
    "availability": "busy",
    "services": {
      "chat": true,
      "call": true,
      "video": true,
      "live": false
    },
    "status": "active",
    "kyc": "verified",
    "city": "Indore",
    "joinedAt": "2026-05-23T07:30:00"
  },
  {
    "id": "AST2016",
    "code": "2024115843",
    "name": "Simran Chandravanshi",
    "phone": "+91 9789345666",
    "email": "astro.simran@vedrashi.in",
    "gender": "Female",
    "experienceYears": 7,
    "languages": [
      "Bengali"
    ],
    "skills": [
      "Tarot",
      "Palmistry"
    ],
    "pricing": {
      "chat": 15,
      "call": 20,
      "video": 35
    },
    "rating": 4.7,
    "reviews": 679,
    "sessions": 3164,
    "followers": 6418,
    "earnings": 349513,
    "walletBalance": 39402,
    "badge": "Rising Star",
    "availability": "offline",
    "services": {
      "chat": true,
      "call": false,
      "video": false,
      "live": false
    },
    "status": "suspended",
    "kyc": "pending",
    "city": "Kolkata",
    "joinedAt": "2026-08-16T22:00:00"
  },
  {
    "id": "AST2017",
    "code": "2024114472",
    "name": "Rohan Iyer",
    "phone": "+91 9520437628",
    "email": "astro.rohan@vedrashi.in",
    "gender": "Male",
    "experienceYears": 20,
    "languages": [
      "Hindi",
      "Bengali",
      "English"
    ],
    "skills": [
      "Vedic",
      "Health"
    ],
    "pricing": {
      "chat": 10,
      "call": 15,
      "video": 35
    },
    "rating": 4.2,
    "reviews": 300,
    "sessions": 490,
    "followers": 555,
    "earnings": 48672,
    "walletBalance": 9070,
    "availability": "offline",
    "services": {
      "chat": true,
      "call": true,
      "video": true,
      "live": true
    },
    "status": "active",
    "kyc": "verified",
    "city": "Chennai",
    "joinedAt": "2026-06-07T08:45:00"
  },
  {
    "id": "AST2018",
    "code": "2024101564",
    "name": "Suresh Verma",
    "phone": "+91 9971898776",
    "email": "astro.suresh@vedrashi.in",
    "gender": "Male",
    "experienceYears": 25,
    "languages": [
      "Hindi",
      "Tamil",
      "Telugu"
    ],
    "skills": [
      "Tarot",
      "Numerology"
    ],
    "pricing": {
      "chat": 15,
      "call": 25,
      "video": 50
    },
    "rating": 4.2,
    "reviews": 544,
    "sessions": 362,
    "followers": 5799,
    "earnings": 274171,
    "walletBalance": 18520,
    "badge": "Top Choice",
    "availability": "busy",
    "services": {
      "chat": true,
      "call": true,
      "video": false,
      "live": false
    },
    "status": "active",
    "kyc": "verified",
    "city": "Jaipur",
    "joinedAt": "2026-01-26T19:00:00"
  }
]
