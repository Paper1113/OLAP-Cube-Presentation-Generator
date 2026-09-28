export interface IndustryProduct {
  id: string;
  label: string;
}

export interface IndustryProductCategory {
  id: string;
  label: string;
  products: IndustryProduct[];
}

export interface IndustryCity {
  id: string;
  label: string;
}

export interface IndustryCountry {
  id: string;
  label: string;
  cities: IndustryCity[];
}

export interface IndustrySalesProfile {
  minimum: number;
  maximum: number;
  /** Optional monthly multipliers, ordered Jan through Dec. */
  seasonality?: number[];
}

export interface IndustryTemplate {
  id: string;
  name: string;
  productCategories: IndustryProductCategory[];
  countries: IndustryCountry[];
  salesProfile: IndustrySalesProfile;
}

const retailSeasonality = [0.86, 0.88, 0.93, 0.95, 0.98, 1, 0.96, 0.97, 1.01, 1.06, 1.15, 1.25];
const steadySeasonality = [0.95, 0.96, 0.98, 1, 1.01, 1.02, 1, 0.99, 1, 1.02, 1.04, 1.03];

/**
 * Small, synthetic examples intended for teaching OLAP concepts. They are not
 * real company data and their generated sales values do not represent real sales.
 */
export const industryTemplates: IndustryTemplate[] = [
  {
    id: "furniture-home",
    name: "Furniture & Home Living",
    productCategories: [
      { id: "living-room", label: "Living Room", products: [{ id: "sofa", label: "Sofa" }, { id: "armchair", label: "Armchair" }] },
      { id: "bedroom", label: "Bedroom", products: [{ id: "bed-frame", label: "Bed Frame" }] },
      { id: "storage", label: "Storage", products: [{ id: "bookcase", label: "Bookcase" }] },
    ],
    countries: [
      { id: "australia", label: "Australia", cities: [{ id: "sydney", label: "Sydney" }, { id: "perth", label: "Perth" }] },
      { id: "united-states", label: "United States", cities: [{ id: "los-angeles", label: "Los Angeles" }] },
    ],
    salesProfile: { minimum: 900, maximum: 5_000, seasonality: retailSeasonality },
  },
  {
    id: "consumer-electronics",
    name: "Consumer Electronics",
    productCategories: [
      { id: "mobile-devices", label: "Mobile Devices", products: [{ id: "smartphone", label: "Smartphone" }, { id: "tablet", label: "Tablet" }] },
      { id: "computing", label: "Computing", products: [{ id: "laptop", label: "Laptop" }] },
      { id: "home-entertainment", label: "Home Entertainment", products: [{ id: "smart-tv", label: "Smart TV" }] },
    ],
    countries: [
      { id: "united-states", label: "United States", cities: [{ id: "new-york", label: "New York" }, { id: "san-francisco", label: "San Francisco" }] },
      { id: "japan", label: "Japan", cities: [{ id: "tokyo", label: "Tokyo" }] },
    ],
    salesProfile: { minimum: 1_200, maximum: 8_000, seasonality: retailSeasonality },
  },
  {
    id: "fashion-apparel",
    name: "Fashion & Apparel",
    productCategories: [
      { id: "tops", label: "Tops", products: [{ id: "t-shirt", label: "T-Shirt" }] },
      { id: "bottoms", label: "Bottoms", products: [{ id: "jeans", label: "Jeans" }] },
      { id: "outerwear", label: "Outerwear", products: [{ id: "jacket", label: "Jacket" }] },
      { id: "footwear", label: "Footwear", products: [{ id: "sneakers", label: "Sneakers" }] },
    ],
    countries: [
      { id: "united-kingdom", label: "United Kingdom", cities: [{ id: "london", label: "London" }, { id: "manchester", label: "Manchester" }] },
      { id: "france", label: "France", cities: [{ id: "paris", label: "Paris" }] },
    ],
    salesProfile: { minimum: 300, maximum: 3_500, seasonality: retailSeasonality },
  },
  {
    id: "grocery-supermarket",
    name: "Grocery & Supermarket",
    productCategories: [
      { id: "fresh-food", label: "Fresh Food", products: [{ id: "fresh-fruit", label: "Fresh Fruit" }] },
      { id: "dairy", label: "Dairy", products: [{ id: "milk", label: "Milk" }] },
      { id: "bakery", label: "Bakery", products: [{ id: "bread", label: "Bread" }] },
      { id: "beverages", label: "Beverages", products: [{ id: "fruit-juice", label: "Fruit Juice" }] },
    ],
    countries: [
      { id: "australia", label: "Australia", cities: [{ id: "melbourne", label: "Melbourne" }, { id: "brisbane", label: "Brisbane" }] },
      { id: "singapore", label: "Singapore", cities: [{ id: "singapore-city", label: "Singapore" }] },
    ],
    salesProfile: { minimum: 200, maximum: 2_000, seasonality: steadySeasonality },
  },
  {
    id: "automotive",
    name: "Automotive",
    productCategories: [
      { id: "passenger-vehicles", label: "Passenger Vehicles", products: [{ id: "sedan", label: "Sedan" }, { id: "suv", label: "SUV" }] },
      { id: "electric-vehicles", label: "Electric Vehicles", products: [{ id: "electric-hatchback", label: "Electric Hatchback" }] },
      { id: "accessories", label: "Accessories", products: [{ id: "tyre-set", label: "Tyre Set" }] },
    ],
    countries: [
      { id: "germany", label: "Germany", cities: [{ id: "berlin", label: "Berlin" }, { id: "munich", label: "Munich" }] },
      { id: "united-states", label: "United States", cities: [{ id: "detroit", label: "Detroit" }] },
    ],
    salesProfile: { minimum: 5_000, maximum: 35_000, seasonality: steadySeasonality },
  },
  {
    id: "food-beverage",
    name: "Food & Beverage",
    productCategories: [
      { id: "main-course", label: "Main Course", products: [{ id: "burger", label: "Burger" }, { id: "pizza", label: "Pizza" }] },
      { id: "drinks", label: "Drinks", products: [{ id: "coffee", label: "Coffee" }] },
      { id: "dessert", label: "Dessert", products: [{ id: "cake", label: "Cake" }] },
    ],
    countries: [
      { id: "hong-kong", label: "Hong Kong", cities: [{ id: "hong-kong-city", label: "Hong Kong" }] },
      { id: "japan", label: "Japan", cities: [{ id: "tokyo", label: "Tokyo" }, { id: "osaka", label: "Osaka" }] },
    ],
    salesProfile: { minimum: 250, maximum: 2_500, seasonality: steadySeasonality },
  },
  {
    id: "hospitality-travel",
    name: "Hospitality & Travel",
    productCategories: [
      { id: "rooms", label: "Rooms", products: [{ id: "standard-room", label: "Standard Room" }, { id: "deluxe-room", label: "Deluxe Room" }] },
      { id: "packages", label: "Packages", products: [{ id: "weekend-package", label: "Weekend Package" }] },
      { id: "services", label: "Services", products: [{ id: "airport-transfer", label: "Airport Transfer" }] },
    ],
    countries: [
      { id: "thailand", label: "Thailand", cities: [{ id: "bangkok", label: "Bangkok" }, { id: "phuket", label: "Phuket" }] },
      { id: "singapore", label: "Singapore", cities: [{ id: "singapore-city", label: "Singapore" }] },
    ],
    salesProfile: { minimum: 800, maximum: 9_000, seasonality: [0.88, 0.9, 0.96, 1, 1.08, 1.15, 1.2, 1.18, 1.04, 0.98, 0.95, 1.12] },
  },
  {
    id: "healthcare-pharmacy",
    name: "Healthcare & Pharmacy",
    productCategories: [
      { id: "otc-products", label: "OTC Products", products: [{ id: "pain-relief", label: "Pain Relief" }, { id: "cold-flu", label: "Cold & Flu" }] },
      { id: "personal-care", label: "Personal Care", products: [{ id: "daily-vitamins", label: "Daily Vitamins" }] },
      { id: "first-aid", label: "First Aid", products: [{ id: "first-aid-kit", label: "First Aid Kit" }] },
    ],
    countries: [
      { id: "united-kingdom", label: "United Kingdom", cities: [{ id: "london", label: "London" }, { id: "birmingham", label: "Birmingham" }] },
      { id: "canada", label: "Canada", cities: [{ id: "toronto", label: "Toronto" }] },
    ],
    salesProfile: { minimum: 250, maximum: 3_000, seasonality: steadySeasonality },
  },
  {
    id: "sports-fitness",
    name: "Sports & Fitness",
    productCategories: [
      { id: "fitness-equipment", label: "Fitness Equipment", products: [{ id: "treadmill", label: "Treadmill" }, { id: "dumbbell-set", label: "Dumbbell Set" }] },
      { id: "footwear", label: "Footwear", products: [{ id: "running-shoes", label: "Running Shoes" }] },
      { id: "accessories", label: "Accessories", products: [{ id: "yoga-mat", label: "Yoga Mat" }] },
    ],
    countries: [
      { id: "australia", label: "Australia", cities: [{ id: "sydney", label: "Sydney" }, { id: "melbourne", label: "Melbourne" }] },
      { id: "united-states", label: "United States", cities: [{ id: "chicago", label: "Chicago" }] },
    ],
    salesProfile: { minimum: 450, maximum: 4_000, seasonality: [1.12, 1.08, 1.04, 1, 0.96, 0.94, 0.93, 0.95, 0.98, 1.01, 1.05, 1.14] },
  },
  {
    id: "beauty-personal-care",
    name: "Beauty & Personal Care",
    productCategories: [
      { id: "skincare", label: "Skincare", products: [{ id: "face-cleanser", label: "Face Cleanser" }, { id: "moisturizer", label: "Moisturizer" }] },
      { id: "haircare", label: "Haircare", products: [{ id: "shampoo", label: "Shampoo" }] },
      { id: "cosmetics", label: "Cosmetics", products: [{ id: "lipstick", label: "Lipstick" }] },
    ],
    countries: [
      { id: "south-korea", label: "South Korea", cities: [{ id: "seoul", label: "Seoul" }, { id: "busan", label: "Busan" }] },
      { id: "japan", label: "Japan", cities: [{ id: "tokyo", label: "Tokyo" }] },
    ],
    salesProfile: { minimum: 200, maximum: 3_000, seasonality: retailSeasonality },
  },
];

export const getIndustryTemplate = (industryId: string): IndustryTemplate | undefined =>
  industryTemplates.find((template) => template.id === industryId);

export const defaultIndustryId = industryTemplates[0].id;
