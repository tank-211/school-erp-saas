export const serializeBigInt = (data) => {
  return JSON.parse(
    JSON.stringify(data, (_, value) =>
      typeof value === "bigint" ? value.toString() : value
    )
  );
};

// For nullable BigInt columns fed from a token/user id: whole numbers only, else null.
export const toBigIntOrNull = (value) =>
  value !== undefined && value !== null && /^\d+$/.test(String(value)) ? BigInt(String(value)) : null;
