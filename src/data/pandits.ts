import type { Pandit } from './types'

// Mock seed — replace with API data when the backend is connected.
export const panditsSeed: Pandit[] = [
  {
    "id": "PND3001",
    "name": "Pandit Rohan Shah",
    "phone": "+91 9707842480",
    "email": "rohan.pandit@vedrashi.in",
    "city": "Bengaluru",
    "serviceRadiusKm": 10,
    "experienceYears": 21,
    "languages": [
      "English",
      "Hindi"
    ],
    "expertise": [
      "Navgraha Puja",
      "Satyanarayan Puja",
      "Lakshmi Puja",
      "Havan"
    ],
    "baseFee": 3100,
    "onlinePuja": true,
    "rating": 4.7,
    "reviews": 99,
    "bookings": 509,
    "earnings": 738101,
    "walletBalance": 54515,
    "acceptingBookings": true,
    "status": "active",
    "kyc": "verified",
    "certificates": [
      {
        "name": "Sanskrit Shastri",
        "status": "verified"
      },
      {
        "name": "Vastu Shastra Certified",
        "status": "under review"
      }
    ],
    "bank": {
      "bank": "Kotak Mahindra Bank",
      "accountLast4": "3603",
      "ifsc": "SBIN0004517",
      "holder": "Rohan Shah"
    },
    "joinedAt": "2026-04-16T11:00:00"
  },
  {
    "id": "PND3002",
    "name": "Pandit Manish Chandravanshi",
    "phone": "+91 9523697937",
    "email": "manish.pandit@vedrashi.in",
    "city": "Indore",
    "serviceRadiusKm": 10,
    "experienceYears": 30,
    "languages": [
      "Marathi",
      "Sanskrit"
    ],
    "expertise": [
      "Navgraha Puja",
      "Vastu Puja",
      "Namkaran",
      "Rudrabhishek",
      "Vivah Puja"
    ],
    "baseFee": 2100,
    "onlinePuja": false,
    "rating": 4.1,
    "reviews": 309,
    "bookings": 37,
    "earnings": 740826,
    "walletBalance": 38114,
    "acceptingBookings": true,
    "status": "active",
    "kyc": "verified",
    "certificates": [
      {
        "name": "Jyotish Acharya",
        "status": "verified"
      },
      {
        "name": "Vastu Shastra Certified",
        "status": "verified"
      },
      {
        "name": "Vedic Karmakand Diploma",
        "status": "verified"
      }
    ],
    "bank": {
      "bank": "ICICI Bank",
      "accountLast4": "8377",
      "ifsc": "KKBK0006297",
      "holder": "Manish Chandravanshi"
    },
    "joinedAt": "2026-03-15T20:30:00"
  },
  {
    "id": "PND3003",
    "name": "Pandit Sanjay Verma",
    "phone": "+91 9423741422",
    "email": "sanjay.pandit@vedrashi.in",
    "city": "Indore",
    "serviceRadiusKm": 15,
    "experienceYears": 12,
    "languages": [
      "Bhojpuri",
      "Marathi"
    ],
    "expertise": [
      "Rudrabhishek",
      "Vivah Puja",
      "Havan",
      "Lakshmi Puja",
      "Kaal Sarp Dosh"
    ],
    "baseFee": 1100,
    "onlinePuja": true,
    "rating": 4.7,
    "reviews": 105,
    "bookings": 396,
    "earnings": 326586,
    "walletBalance": 9720,
    "acceptingBookings": true,
    "status": "active",
    "kyc": "verified",
    "certificates": [
      {
        "name": "Vedic Karmakand Diploma",
        "status": "verified"
      },
      {
        "name": "Vastu Shastra Certified",
        "status": "verified"
      }
    ],
    "bank": {
      "bank": "State Bank of India",
      "accountLast4": "8125",
      "ifsc": "SBIN0004214",
      "holder": "Sanjay Verma"
    },
    "joinedAt": "2026-02-21T09:30:00"
  },
  {
    "id": "PND3004",
    "name": "Pandit Suresh Saini",
    "phone": "+91 9949334392",
    "email": "suresh.pandit@vedrashi.in",
    "city": "Ahmedabad",
    "serviceRadiusKm": 15,
    "experienceYears": 35,
    "languages": [
      "English",
      "Hindi",
      "Sanskrit"
    ],
    "expertise": [
      "Lakshmi Puja",
      "Vastu Puja",
      "Satyanarayan Puja",
      "Vivah Puja",
      "Kaal Sarp Dosh"
    ],
    "baseFee": 3100,
    "onlinePuja": false,
    "rating": 4.6,
    "reviews": 336,
    "bookings": 434,
    "earnings": 489334,
    "walletBalance": 43771,
    "acceptingBookings": true,
    "status": "active",
    "kyc": "verified",
    "certificates": [
      {
        "name": "Jyotish Acharya",
        "status": "verified"
      }
    ],
    "bank": {
      "bank": "Kotak Mahindra Bank",
      "accountLast4": "4745",
      "ifsc": "ICIC0003035",
      "holder": "Suresh Saini"
    },
    "joinedAt": "2026-08-14T16:30:00"
  },
  {
    "id": "PND3005",
    "name": "Pandit Manish Iyer",
    "phone": "+91 9776043644",
    "email": "manish.pandit@vedrashi.in",
    "city": "Delhi",
    "serviceRadiusKm": 25,
    "experienceYears": 30,
    "languages": [
      "English",
      "Hindi",
      "Bhojpuri"
    ],
    "expertise": [
      "Kaal Sarp Dosh",
      "Havan",
      "Satyanarayan Puja",
      "Vastu Puja"
    ],
    "baseFee": 3100,
    "onlinePuja": false,
    "rating": 4.1,
    "reviews": 133,
    "bookings": 559,
    "earnings": 466930,
    "walletBalance": 10540,
    "acceptingBookings": true,
    "status": "active",
    "kyc": "verified",
    "certificates": [
      {
        "name": "Vedic Karmakand Diploma",
        "status": "under review"
      },
      {
        "name": "Sanskrit Shastri",
        "status": "under review"
      }
    ],
    "bank": {
      "bank": "ICICI Bank",
      "accountLast4": "9506",
      "ifsc": "SBIN0002656",
      "holder": "Manish Iyer"
    },
    "joinedAt": "2026-08-18T12:45:00"
  },
  {
    "id": "PND3006",
    "name": "Pandit Nitin Sharma",
    "phone": "+91 9325581790",
    "email": "nitin.pandit@vedrashi.in",
    "city": "Varanasi",
    "serviceRadiusKm": 15,
    "experienceYears": 28,
    "languages": [
      "Bhojpuri",
      "Gujarati"
    ],
    "expertise": [
      "Kaal Sarp Dosh",
      "Satyanarayan Puja",
      "Navgraha Puja",
      "Namkaran",
      "Vivah Puja"
    ],
    "baseFee": 3100,
    "onlinePuja": true,
    "rating": 4.1,
    "reviews": 220,
    "bookings": 363,
    "earnings": 566075,
    "walletBalance": 7160,
    "acceptingBookings": true,
    "status": "active",
    "kyc": "verified",
    "certificates": [
      {
        "name": "Vastu Shastra Certified",
        "status": "under review"
      },
      {
        "name": "Vedic Karmakand Diploma",
        "status": "verified"
      }
    ],
    "bank": {
      "bank": "Axis Bank",
      "accountLast4": "9635",
      "ifsc": "ICIC0007421",
      "holder": "Nitin Sharma"
    },
    "joinedAt": "2026-08-07T11:15:00"
  },
  {
    "id": "PND3007",
    "name": "Pandit Amit Chandravanshi",
    "phone": "+91 9703500797",
    "email": "amit.pandit@vedrashi.in",
    "city": "Indore",
    "serviceRadiusKm": 15,
    "experienceYears": 12,
    "languages": [
      "Bhojpuri",
      "English",
      "Gujarati"
    ],
    "expertise": [
      "Namkaran",
      "Rudrabhishek",
      "Mundan",
      "Havan",
      "Vastu Puja"
    ],
    "baseFee": 2100,
    "onlinePuja": true,
    "rating": 4.4,
    "reviews": 134,
    "bookings": 439,
    "earnings": 399839,
    "walletBalance": 31560,
    "acceptingBookings": false,
    "status": "pending",
    "kyc": "pending",
    "certificates": [
      {
        "name": "Sanskrit Shastri",
        "status": "under review"
      }
    ],
    "bank": {
      "bank": "HDFC Bank",
      "accountLast4": "5607",
      "ifsc": "SBIN0005013",
      "holder": "Amit Chandravanshi"
    },
    "joinedAt": "2026-05-11T21:45:00"
  },
  {
    "id": "PND3008",
    "name": "Pandit Rohan Deshmukh",
    "phone": "+91 9988950726",
    "email": "rohan.pandit@vedrashi.in",
    "city": "Chennai",
    "serviceRadiusKm": 25,
    "experienceYears": 11,
    "languages": [
      "Bhojpuri",
      "Gujarati",
      "Hindi"
    ],
    "expertise": [
      "Vivah Puja",
      "Griha Pravesh",
      "Navgraha Puja"
    ],
    "baseFee": 2500,
    "onlinePuja": false,
    "rating": 4.6,
    "reviews": 124,
    "bookings": 193,
    "earnings": 957828,
    "walletBalance": 22704,
    "acceptingBookings": true,
    "status": "active",
    "kyc": "verified",
    "certificates": [
      {
        "name": "Vastu Shastra Certified",
        "status": "verified"
      },
      {
        "name": "Jyotish Acharya",
        "status": "verified"
      },
      {
        "name": "Vedic Karmakand Diploma",
        "status": "verified"
      }
    ],
    "bank": {
      "bank": "ICICI Bank",
      "accountLast4": "7594",
      "ifsc": "KKBK0003751",
      "holder": "Rohan Deshmukh"
    },
    "joinedAt": "2026-02-22T15:15:00"
  },
  {
    "id": "PND3009",
    "name": "Pandit Karan Iyer",
    "phone": "+91 9225606987",
    "email": "karan.pandit@vedrashi.in",
    "city": "Kolkata",
    "serviceRadiusKm": 10,
    "experienceYears": 19,
    "languages": [
      "Sanskrit",
      "Bhojpuri",
      "English"
    ],
    "expertise": [
      "Namkaran",
      "Satyanarayan Puja",
      "Mundan",
      "Kaal Sarp Dosh",
      "Griha Pravesh",
      "Havan"
    ],
    "baseFee": 3100,
    "onlinePuja": true,
    "rating": 4.2,
    "reviews": 311,
    "bookings": 9,
    "earnings": 346293,
    "walletBalance": 55100,
    "acceptingBookings": true,
    "status": "active",
    "kyc": "verified",
    "certificates": [
      {
        "name": "Sanskrit Shastri",
        "status": "under review"
      }
    ],
    "bank": {
      "bank": "Kotak Mahindra Bank",
      "accountLast4": "9152",
      "ifsc": "SBIN0008631",
      "holder": "Karan Iyer"
    },
    "joinedAt": "2026-06-14T19:00:00"
  },
  {
    "id": "PND3010",
    "name": "Pandit Rajesh Rao",
    "phone": "+91 9968227186",
    "email": "rajesh.pandit@vedrashi.in",
    "city": "Mumbai",
    "serviceRadiusKm": 40,
    "experienceYears": 34,
    "languages": [
      "Hindi",
      "Sanskrit"
    ],
    "expertise": [
      "Kaal Sarp Dosh",
      "Rudrabhishek",
      "Havan",
      "Griha Pravesh",
      "Vastu Puja",
      "Namkaran"
    ],
    "baseFee": 2500,
    "onlinePuja": true,
    "rating": 4.8,
    "reviews": 288,
    "bookings": 218,
    "earnings": 605907,
    "walletBalance": 28520,
    "acceptingBookings": true,
    "status": "active",
    "kyc": "verified",
    "certificates": [
      {
        "name": "Jyotish Acharya",
        "status": "under review"
      },
      {
        "name": "Sanskrit Shastri",
        "status": "under review"
      },
      {
        "name": "Vastu Shastra Certified",
        "status": "verified"
      }
    ],
    "bank": {
      "bank": "State Bank of India",
      "accountLast4": "1863",
      "ifsc": "SBIN0005798",
      "holder": "Rajesh Rao"
    },
    "joinedAt": "2026-06-27T21:45:00"
  },
  {
    "id": "PND3011",
    "name": "Pandit Arjun Shah",
    "phone": "+91 9440477083",
    "email": "arjun.pandit@vedrashi.in",
    "city": "Indore",
    "serviceRadiusKm": 25,
    "experienceYears": 11,
    "languages": [
      "Hindi",
      "English"
    ],
    "expertise": [
      "Namkaran",
      "Lakshmi Puja",
      "Satyanarayan Puja",
      "Vastu Puja",
      "Rudrabhishek",
      "Kaal Sarp Dosh"
    ],
    "baseFee": 1100,
    "onlinePuja": true,
    "rating": 4.8,
    "reviews": 248,
    "bookings": 64,
    "earnings": 1060343,
    "walletBalance": 59626,
    "acceptingBookings": false,
    "status": "suspended",
    "kyc": "pending",
    "certificates": [
      {
        "name": "Vastu Shastra Certified",
        "status": "verified"
      },
      {
        "name": "Jyotish Acharya",
        "status": "verified"
      },
      {
        "name": "Vedic Karmakand Diploma",
        "status": "verified"
      }
    ],
    "bank": {
      "bank": "Kotak Mahindra Bank",
      "accountLast4": "7161",
      "ifsc": "KKBK0003409",
      "holder": "Arjun Shah"
    },
    "joinedAt": "2026-02-07T07:45:00"
  },
  {
    "id": "PND3012",
    "name": "Pandit Rajesh Patel",
    "phone": "+91 9804071242",
    "email": "rajesh.pandit@vedrashi.in",
    "city": "Pune",
    "serviceRadiusKm": 25,
    "experienceYears": 11,
    "languages": [
      "Gujarati",
      "Marathi",
      "Bhojpuri"
    ],
    "expertise": [
      "Vastu Puja",
      "Satyanarayan Puja",
      "Havan",
      "Lakshmi Puja"
    ],
    "baseFee": 3100,
    "onlinePuja": true,
    "rating": 4.6,
    "reviews": 32,
    "bookings": 512,
    "earnings": 1105036,
    "walletBalance": 2580,
    "acceptingBookings": true,
    "status": "active",
    "kyc": "verified",
    "certificates": [
      {
        "name": "Sanskrit Shastri",
        "status": "verified"
      }
    ],
    "bank": {
      "bank": "Axis Bank",
      "accountLast4": "7629",
      "ifsc": "UTIB0002101",
      "holder": "Rajesh Patel"
    },
    "joinedAt": "2026-01-22T18:15:00"
  },
  {
    "id": "PND3013",
    "name": "Pandit Karan Chandravanshi",
    "phone": "+91 9607012857",
    "email": "karan.pandit@vedrashi.in",
    "city": "Bengaluru",
    "serviceRadiusKm": 15,
    "experienceYears": 3,
    "languages": [
      "Hindi",
      "Bhojpuri",
      "Gujarati"
    ],
    "expertise": [
      "Vivah Puja",
      "Griha Pravesh",
      "Rudrabhishek"
    ],
    "baseFee": 3100,
    "onlinePuja": true,
    "rating": 4.7,
    "reviews": 129,
    "bookings": 464,
    "earnings": 403027,
    "walletBalance": 3285,
    "acceptingBookings": true,
    "status": "active",
    "kyc": "verified",
    "certificates": [
      {
        "name": "Jyotish Acharya",
        "status": "under review"
      }
    ],
    "bank": {
      "bank": "ICICI Bank",
      "accountLast4": "2381",
      "ifsc": "SBIN0009160",
      "holder": "Karan Chandravanshi"
    },
    "joinedAt": "2026-08-22T14:00:00"
  },
  {
    "id": "PND3014",
    "name": "Pandit Deepak Sharma",
    "phone": "+91 9434000923",
    "email": "deepak.pandit@vedrashi.in",
    "city": "Jaipur",
    "serviceRadiusKm": 15,
    "experienceYears": 34,
    "languages": [
      "Marathi",
      "Bhojpuri"
    ],
    "expertise": [
      "Mundan",
      "Rudrabhishek",
      "Lakshmi Puja",
      "Griha Pravesh",
      "Namkaran",
      "Havan"
    ],
    "baseFee": 2100,
    "onlinePuja": false,
    "rating": 4.4,
    "reviews": 202,
    "bookings": 466,
    "earnings": 580384,
    "walletBalance": 51421,
    "acceptingBookings": true,
    "status": "active",
    "kyc": "verified",
    "certificates": [
      {
        "name": "Jyotish Acharya",
        "status": "verified"
      }
    ],
    "bank": {
      "bank": "State Bank of India",
      "accountLast4": "5790",
      "ifsc": "SBIN0001993",
      "holder": "Deepak Sharma"
    },
    "joinedAt": "2026-06-28T06:15:00"
  }
]
