const BASE_URL = "https://52-3-52-92.sslip.io/v1/api";

// Uploaded photos are served from the site root at /uploads/..., not under
// /v1/api, so the media base drops that suffix.
const MEDIA_BASE_URL = BASE_URL.replace(/\/v1\/api\/?$/, '');

// Printed on every bill, in the bottom corner. The only place these three
// values live, so a change here updates the single bill and the print-all
// batch together.
const BRAND = {
  name: "Murtadak Dairy Farm",
  ownerName: "Vishnu Murtadak",
  phone: "9850572347",
};

const ENDPOINTS = {
  LOGIN: "/Auth/login",
   LOGOUT: "/Auth/logout",
  GET_CUSTOMERS: "/Customer",
  ADD_CUSTOMER: "/Customer",
  GET_CUSTOMER_DETAILS: "/MilkEntries/getmilkOnId",
  ADD_MILK_ENTRY: "/MilkEntries",
  SEARCH_CUSTOMER: "/Customer/search",

  // One path serves get-by-id, update and delete:
  //   GET    /Customer/{id}
  //   PUT    /Customer      (customerId in the body)
  //   DELETE /Customer/{id}
  CUSTOMER: "/Customer",
  DELETE_MILK_ENTRY: "/MilkEntries/deleteMilkEntry",
  UPDATE_MILK_ENTRY: "/MilkEntries/updateMilkEntry",
  BILL: "/Bill",
  BILL_HISTORY: "/Bill/history",
};

export default { BASE_URL, MEDIA_BASE_URL, BRAND, ENDPOINTS };
