import { createSlice } from "@reduxjs/toolkit";
import type { PayloadAction } from "@reduxjs/toolkit";

export interface AuthState {
  token: string | null;
}

const initialState: AuthState = {
  token: localStorage.getItem("token"), // ✅ leer token inicial
};

const authSlice = createSlice({
  name: "auth",
  initialState,
  reducers: {
    setToken: (state, action: PayloadAction<string>) => {
      state.token = action.payload;
      localStorage.setItem("token", action.payload); // ✅ guardar token
    },
    clearToken: (state) => {
      state.token = null;
      localStorage.removeItem("token"); // ✅ limpiar token
    },
  },
});

export const { setToken, clearToken } = authSlice.actions;
export default authSlice.reducer;
