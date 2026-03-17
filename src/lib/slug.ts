import { customAlphabet } from "nanoid";

const SLUG_ALPHABET = "0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ";
const SLUG_LENGTH = 7;

const createSlug = customAlphabet(SLUG_ALPHABET, SLUG_LENGTH);

export function generateSlug() {
  return createSlug();
}

export { SLUG_ALPHABET, SLUG_LENGTH };
