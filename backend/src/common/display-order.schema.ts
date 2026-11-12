export function displayOrderField() {
  return {
    type: Number,
    min: 0,
    default: 0,
    validate: {
      validator: Number.isInteger,
      message: 'displayOrder must be a non-negative integer',
    },
  };
}
