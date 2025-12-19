 const BASE_URL = "https://billingservice-production-60e1.up.railway.app/v1/api";

 const ENDPOINTS = {
  LOGIN: "/Auth/login",
  GET_CUSTOMERS:"/Customer",
  ADD_CUSTOMER:"/Customer",
  GET_CUSTOMER_DETAILS:"/MilkEntries/getmilkOnId",
  ADD_MILK_ENTRY:"/MilkEntries",
  SEARCH_CUSTOMER:"/Customer/search"
};

export default { BASE_URL, ENDPOINTS }
