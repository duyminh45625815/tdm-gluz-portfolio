import { Schema } from 'mongoose';

export interface Presentations {
  home?: boolean;
  about?: boolean;
}

export const presentationsSchema = new Schema<Presentations>(
  {
    home: { type: Boolean, required: true, default: false },
    about: { type: Boolean, required: true, default: false },
  },
  { _id: false, strict: true },
);
