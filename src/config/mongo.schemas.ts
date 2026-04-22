// src/config/mongo.schemas.ts
// هذا الملف يوثّق هيكل مجموعات MongoDB (Chat)
// يُستخدم مع Mongoose

import mongoose, { Schema, Document } from 'mongoose';

// ══════════════════════════════════════════
// Message Schema
// ══════════════════════════════════════════
export interface IMessage extends Document {
  groupId: string;       // يرتبط بـ Group.id في Postgres
  senderId: string;      // يرتبط بـ User.id في Postgres
  senderName: string;
  senderRole: 'USER' | 'GUARDIAN' | 'SUPERVISOR';
  content: string;
  type: 'TEXT' | 'IMAGE' | 'SYSTEM';
  isDeleted: boolean;
  deletedAt?: Date;
  createdAt: Date;
}

const MessageSchema = new Schema<IMessage>(
  {
    groupId:    { type: String, required: true, index: true },
    senderId:   { type: String, required: true },
    senderName: { type: String, required: true },
    senderRole: { type: String, enum: ['USER', 'GUARDIAN', 'SUPERVISOR'], required: true },
    content:    { type: String, required: true, maxlength: 2000 },
    type:       { type: String, enum: ['TEXT', 'IMAGE', 'SYSTEM'], default: 'TEXT' },
    isDeleted:  { type: Boolean, default: false },
    deletedAt:  { type: Date },
  },
  { timestamps: true }
);

MessageSchema.index({ groupId: 1, createdAt: -1 });

export const Message = mongoose.model<IMessage>('Message', MessageSchema);
