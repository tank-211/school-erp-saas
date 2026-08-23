export const serializeBigInt = (obj) =>
  JSON.parse(
    JSON.stringify(
      obj,
      (_, value) =>
        typeof value === "bigint"
          ? value.toString()
          : value
    )
  );