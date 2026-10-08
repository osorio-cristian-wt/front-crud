import { render, screen, fireEvent } from '@testing-library/react';
import App from './App';
import { authService } from './services/authService';

// Tests de integración del flujo de login dentro de App (App + LoginForm + Navbar).
// Se mockean el servicio de autenticación y el cliente de la API: no hace falta backend.
jest.mock('./services/authService', () => ({
  authService: { login: jest.fn(), logout: jest.fn() },
}));
jest.mock('./services/api', () => ({
  __esModule: true,
  default: { get: jest.fn(), post: jest.fn(), put: jest.fn(), delete: jest.fn() },
}));

const USUARIO = { name: 'Usuario de Prueba', role: 'admin' };

const ingresar = (email, password) => {
  fireEvent.change(document.querySelector('input[name="email"]'), { target: { value: email } });
  fireEvent.change(document.querySelector('input[name="password"]'), { target: { value: password } });
  fireEvent.click(screen.getByRole('button', { name: 'Ingresar' }));
};

beforeEach(() => {
  localStorage.clear();
  jest.clearAllMocks();
  jest.spyOn(console, 'log').mockImplementation(() => {});
});

afterEach(() => {
  jest.restoreAllMocks();
});

test('sin sesión guardada se muestra el formulario de login', () => {
  // Construcción y prueba
  render(<App />);

  // Verificación
  expect(screen.getByRole('heading', { name: 'Iniciar Sesión' })).toBeInTheDocument();
  expect(screen.queryByText('Bienvenido al Sistema')).not.toBeInTheDocument();
});

test('login exitoso: muestra la bienvenida y el usuario en el navbar', async () => {
  // Construcción: el servicio falso acepta el login
  authService.login.mockResolvedValue({ success: true, accessToken: 't', user: USUARIO });
  render(<App />);

  // Prueba
  ingresar('admin@correo.com', '123');

  // Verificación
  expect(await screen.findByText('Bienvenido al Sistema')).toBeInTheDocument();
  expect(screen.getByText('Usuario de Prueba')).toBeInTheDocument();
  expect(screen.getByText('Salir')).toBeInTheDocument();
  expect(screen.queryByRole('heading', { name: 'Iniciar Sesión' })).not.toBeInTheDocument();
});

test('login fallido: sigue en el login y muestra el error', async () => {
  // Construcción
  authService.login.mockRejectedValue({ message: 'Credenciales de Mock inválidas' });
  render(<App />);

  // Prueba
  ingresar('otro@correo.com', '999');

  // Verificación
  expect(await screen.findByText('Credenciales de Mock inválidas')).toBeInTheDocument();
  expect(screen.getByRole('heading', { name: 'Iniciar Sesión' })).toBeInTheDocument();
  expect(screen.queryByText('Bienvenido al Sistema')).not.toBeInTheDocument();
});

test('con userData en localStorage entra directo, sin pasar por el login', () => {
  // Construcción: sesión guardada de antes
  localStorage.setItem('userData', JSON.stringify(USUARIO));

  // Prueba
  render(<App />);

  // Verificación
  expect(screen.getByText('Bienvenido al Sistema')).toBeInTheDocument();
  expect(authService.login).not.toHaveBeenCalled();
});

test('Salir vuelve al login y borra la sesión guardada', async () => {
  // Construcción: usuario logueado
  localStorage.setItem('userData', JSON.stringify(USUARIO));
  render(<App />);
  expect(screen.getByText('Bienvenido al Sistema')).toBeInTheDocument();

  // Prueba
  fireEvent.click(screen.getByText('Salir'));

  // Verificación
  expect(await screen.findByRole('heading', { name: 'Iniciar Sesión' })).toBeInTheDocument();
  expect(localStorage.getItem('userData')).toBeNull();
});

test('desde el login se puede ir al registro y volver', async () => {
  // Construcción
  render(<App />);

  // Prueba: ir al registro
  fireEvent.click(screen.getByRole('button', { name: 'Regístrate aquí' }));

  // Verificación
  expect(await screen.findByRole('heading', { name: 'Registro' })).toBeInTheDocument();

  // Prueba: volver al login
  fireEvent.click(screen.getByRole('button', { name: 'Inicia Sesión' }));

  // Verificación
  expect(await screen.findByRole('heading', { name: 'Iniciar Sesión' })).toBeInTheDocument();
});
