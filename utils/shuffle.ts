
/**
 * Shuffles an array multiple times using cryptographically secure random numbers.
 * @param array The array to shuffle.
 * @param passes Number of shuffle passes to ensure high randomness.
 */
export const aggressiveShuffle = <T,>(array: T[], passes: number = 7): T[] => {
  const result = [...array];
  
  for (let p = 0; p < passes; p++) {
    for (let i = result.length - 1; i > 0; i--) {
      // Use crypto.getRandomValues for high-quality randomness
      const randomBuffer = new Uint32Array(1);
      window.crypto.getRandomValues(randomBuffer);
      const j = Math.floor((randomBuffer[0] / (0xffffffff + 1)) * (i + 1));
      
      [result[i], result[j]] = [result[j], result[i]];
    }
  }
  
  return result;
};
