const addNumber = (array, number) => {
  const existingEntry = array.find((entry) => entry.number === number);
  if (existingEntry) {
    existingEntry.count += 1;
  } else {
    array.push({ number: number, count: 1 });
  }
};
const findMinNotInList = (array, step, start) => {
  const sortedNumbers = array.map((item) => item.number).sort((a, b) => a - b);
  let min = start + step;
  while (sortedNumbers.includes(min)) {
    min += step;
  }
  return min;
};

const findNumbersWithCountOneAndLessThanMin = (array, min) => {
  return array.filter((item) => item.count === 1 && item.number < min);
};

module.exports = {
  addNumber,
  findMinNotInList,
  findNumbersWithCountOneAndLessThanMin,
};
