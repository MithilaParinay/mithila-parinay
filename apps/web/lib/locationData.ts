export type CountryOption = {
  code: string;
  name: string;
};

const display = new Intl.DisplayNames(["en"], { type: "region" });

function buildCountryOptions(): CountryOption[] {
  const options: CountryOption[] = [];

  for (let i = 65; i <= 90; i += 1) {
    for (let j = 65; j <= 90; j += 1) {
      const code = `${String.fromCharCode(i)}${String.fromCharCode(j)}`;
      const name = display.of(code) ?? code;

      if (name !== code) {
        options.push({ code, name });
      }
    }
  }

  options.sort((a, b) => a.name.localeCompare(b.name));
  return options;
}

export const COUNTRY_OPTIONS = buildCountryOptions();

const STATES_BY_COUNTRY_CODE: Record<string, string[]> = {
  US: [
    "Alabama", "Alaska", "Arizona", "Arkansas", "California", "Colorado", "Connecticut", "Delaware",
    "Florida", "Georgia", "Hawaii", "Idaho", "Illinois", "Indiana", "Iowa", "Kansas", "Kentucky",
    "Louisiana", "Maine", "Maryland", "Massachusetts", "Michigan", "Minnesota", "Mississippi", "Missouri",
    "Montana", "Nebraska", "Nevada", "New Hampshire", "New Jersey", "New Mexico", "New York",
    "North Carolina", "North Dakota", "Ohio", "Oklahoma", "Oregon", "Pennsylvania", "Rhode Island",
    "South Carolina", "South Dakota", "Tennessee", "Texas", "Utah", "Vermont", "Virginia", "Washington",
    "West Virginia", "Wisconsin", "Wyoming", "District of Columbia",
  ],
  IN: [
    "Andhra Pradesh", "Arunachal Pradesh", "Assam", "Bihar", "Chhattisgarh", "Goa", "Gujarat", "Haryana",
    "Himachal Pradesh", "Jharkhand", "Karnataka", "Kerala", "Madhya Pradesh", "Maharashtra", "Manipur",
    "Meghalaya", "Mizoram", "Nagaland", "Odisha", "Punjab", "Rajasthan", "Sikkim", "Tamil Nadu",
    "Telangana", "Tripura", "Uttar Pradesh", "Uttarakhand", "West Bengal", "Andaman and Nicobar Islands",
    "Chandigarh", "Dadra and Nagar Haveli and Daman and Diu", "Delhi", "Jammu and Kashmir", "Ladakh",
    "Lakshadweep", "Puducherry",
  ],
  CA: [
    "Alberta", "British Columbia", "Manitoba", "New Brunswick", "Newfoundland and Labrador",
    "Northwest Territories", "Nova Scotia", "Nunavut", "Ontario", "Prince Edward Island", "Quebec",
    "Saskatchewan", "Yukon",
  ],
  AU: [
    "Australian Capital Territory", "New South Wales", "Northern Territory", "Queensland", "South Australia",
    "Tasmania", "Victoria", "Western Australia",
  ],
  GB: ["England", "Northern Ireland", "Scotland", "Wales"],
  AE: ["Abu Dhabi", "Ajman", "Dubai", "Fujairah", "Ras Al Khaimah", "Sharjah", "Umm Al Quwain"],
  NP: ["Koshi", "Madhesh", "Bagmati", "Gandaki", "Lumbini", "Karnali", "Sudurpashchim"],
  SG: ["Central", "East", "North", "North-East", "West"],
};

export function getCountryCodeByName(name: string): string {
  const found = COUNTRY_OPTIONS.find((c) => c.name.toLowerCase() === name.toLowerCase());
  return found?.code ?? "";
}

export function getCountryNameByCode(code: string): string {
  const found = COUNTRY_OPTIONS.find((c) => c.code === code);
  return found?.name ?? code;
}

export function getStatesForCountry(countryName: string): string[] {
  const code = getCountryCodeByName(countryName);
  return STATES_BY_COUNTRY_CODE[code] ?? [];
}
