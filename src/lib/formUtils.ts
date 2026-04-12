import React from "react";

/**
 * Propiedades para inputs que necesitan validación en español.
 * Evita el mensaje "Please fill out this field" en navegadores en inglés.
 */
export const getSpanishValidationProps = (message: string = "Por favor, completa este campo") => ({
  onInvalid: (e: React.InvalidEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    (e.target as HTMLInputElement).setCustomValidity(message);
  },
  onInput: (e: React.FormEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    (e.target as HTMLInputElement).setCustomValidity("");
  }
});

/**
 * Mensajes comunes para validaciones específicas
 */
export const VALIDATION_MESSAGES = {
  REQUIRED: "Este campo es obligatorio",
  EMAIL: "Ingresa un correo electrónico válido",
  MIN_LENGTH: (min: number) => `Mínimo ${min} caracteres`,
  PASSWORD_MATCH: "Las contraseñas no coinciden",
};
