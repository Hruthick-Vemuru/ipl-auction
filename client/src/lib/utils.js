export const formatCurrency = (amount) => {
  if (amount >= 10000000) return `₹${(amount / 10000000).toFixed(2)} Cr`;
  if (amount >= 100000) return `₹${(amount / 100000).toFixed(2)} L`;
  return `₹${amount.toLocaleString()}`;
};

export const getTextColorForBackground = (hexColor) => {
  if (!hexColor) return "#000000";
  try {
    const r = parseInt(hexColor.substr(1, 2), 16);
    const g = parseInt(hexColor.substr(3, 2), 16);
    const b = parseInt(hexColor.substr(5, 2), 16);
    const yiq = (r * 299 + g * 587 + b * 114) / 1000;
    return yiq >= 128 ? "#000000" : "#FFFFFF";
  } catch (e) {
    return "#000000";
  }
};

export const shortenName = (name) => {
  if (!name) return "";
  const nameParts = name.split(" ");
  if (nameParts.length === 1) {
    return name;
  }
  const firstName = nameParts[0];
  const lastName = nameParts[nameParts.length - 1];
  let middleInitial = "";
  if (nameParts.length > 2) {
    middleInitial = nameParts
      .slice(1, -1)
      .map((part) => part.charAt(0))
      .join("");
  }
  return `${firstName.charAt(0)}${middleInitial} ${lastName}`;
};
