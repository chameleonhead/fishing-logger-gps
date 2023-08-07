import { restructData } from "../src/message-utils";

describe("message utils", () => {
  it("should restruct data", () => {
    const data = { single: 1 };
    const result = restructData(data);
    expect(result).toEqual({ single: 1 });
  });
  it("should restruct data with single period", () => {
    const data = { "first.second": 1 };
    const result = restructData(data);
    expect(result).toEqual({ first: { second: 1 } });
  });
  it("should restruct data with single period multiple values", () => {
    const data = { "first.first": 1, "first.second": 2 };
    const result = restructData(data);
    expect(result).toEqual({ first: { first: 1, second: 2 } });
  });
  it("should restruct data with double period multiple values", () => {
    const data = { "first.first.first": 1, "first.second": 2 };
    const result = restructData(data);
    expect(result).toEqual({ first: { first: { first: 1 }, second: 2 } });
  });
})