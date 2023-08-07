
export function restructData(data: any) {
  const result = {} as any;
  for (const key in data) {
    const parts = key.split(".");
    let partObject = result;
    for (let i = 0; i < parts.length; i++) {
      if (i == parts.length - 1) {
        partObject[parts[i]] = data[key];
      } else {
        const obj = partObject[parts[i]];
        if (typeof obj !== "object") {
          partObject[parts[i]] = {};
        }
        partObject = partObject[parts[i]]
      }
    }
  }
  return result;
}
