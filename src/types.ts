// src/types.ts
export interface Team {
  id: number;
  teamName: string;
  captainName: string;
  captainEmail: string;
  institute: string;
  members: string[]; // An array of strings
  registeredAt: string;
}

export interface RegistrationFormData {
  teamName: string;
  captainName: string;
  captainEmail: string;
  institute: string;
  members: string[];
}