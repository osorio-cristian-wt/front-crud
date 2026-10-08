import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import LoginForm from './LoginForm';
import { authService } from '../services/authService';

// Tests unitarios de LoginForm.
// El servicio de autenticación se reemplaza por un mock de Jest:
// no se llama a ninguna API ni al modo mock del front, solo se prueba el componente.
jest.mock('../services/authService', () => ({
  authService: { login: jest.fn(), logout: jest.fn() },
}));

const RESPUESTA_OK = {
  success: true,
  accessToken: 'token-de-prueba',
  user: { name: 'Usuario de Prueba', role: 'admin' },
};

// Helper: completa el formulario y presiona "Ingresar"
const ingresar = (email, password) => {
  fireEvent.change(document.querySelector('input[name="email"]'), { target: { value: email } });
  fireEvent.change(document.querySelector('input[name="password"]'), { target: { value: password } });
  fireEvent.click(screen.getByRole('button', { name: 'Ingresar' }));
};

describe('LoginForm', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('muestra el título, los campos y los botones', () => {
    // Construcción y prueba: se dibuja el formulario
    render(<LoginForm onLogin={jest.fn()} onGoToRegister={jest.fn()} />);

    // Verificación: están todos los elementos del login
    expect(screen.getByRole('heading', { name: 'Iniciar Sesión' })).toBeInTheDocument();
    expect(document.querySelector('input[name="email"]')).toBeInTheDocument();
    expect(document.querySelector('input[name="password"]')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Ingresar' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Regístrate aquí' })).toBeInTheDocument();
  });

  test('los campos son obligatorios y el email tiene tipo email (validación HTML5)', () => {
    // Construcción y prueba
    render(<LoginForm onLogin={jest.fn()} onGoToRegister={jest.fn()} />);

    // Verificación: el navegador no deja enviar campos vacíos ni un email sin formato válido
    const email = document.querySelector('input[name="email"]');
    const password = document.querySelector('input[name="password"]');
    expect(email).toBeRequired();
    expect(email).toHaveAttribute('type', 'email');
    expect(password).toBeRequired();
    expect(password).toHaveAttribute('type', 'password');
  });

  test('login exitoso: llama al servicio con lo escrito y avisa a App con la respuesta', async () => {
    // Construcción: el servicio falso responde OK
    authService.login.mockResolvedValue(RESPUESTA_OK);
    const onLogin = jest.fn();
    render(<LoginForm onLogin={onLogin} onGoToRegister={jest.fn()} />);

    // Prueba: se completa el formulario y se envía
    ingresar('admin@correo.com', '123');

    // Verificación: el servicio recibió el email y la contraseña, y onLogin recibió la respuesta completa
    await waitFor(() => expect(onLogin).toHaveBeenCalledWith(RESPUESTA_OK));
    expect(authService.login).toHaveBeenCalledTimes(1);
    expect(authService.login).toHaveBeenCalledWith('admin@correo.com', '123');
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(document.querySelector('.alert-danger')).not.toBeInTheDocument();
  });

  test('credenciales inválidas: muestra el mensaje de error y no loguea', async () => {
    // Construcción: el servicio falso rechaza como lo hace el mock del front
    authService.login.mockRejectedValue({ message: 'Credenciales de Mock inválidas' });
    const onLogin = jest.fn();
    render(<LoginForm onLogin={onLogin} onGoToRegister={jest.fn()} />);

    // Prueba
    ingresar('otro@correo.com', '999');

    // Verificación: aparece la alerta con el texto del error y no se llamó a onLogin
    expect(await screen.findByText('Credenciales de Mock inválidas')).toHaveClass('alert', 'alert-danger');
    expect(onLogin).not.toHaveBeenCalled();
  });

  test('error sin mensaje (ej. API caída): muestra un mensaje genérico', async () => {
    // Construcción: el servicio falla con un error vacío
    authService.login.mockRejectedValue({});
    render(<LoginForm onLogin={jest.fn()} onGoToRegister={jest.fn()} />);

    // Prueba
    ingresar('admin@correo.com', '123');

    // Verificación
    expect(await screen.findByText('Error al conectar con el servidor')).toBeInTheDocument();
  });

  test('respuesta sin success: muestra "Respuesta de servidor inválida" y no loguea', async () => {
    // Construcción: el servicio responde, pero sin success
    authService.login.mockResolvedValue({ success: false });
    const onLogin = jest.fn();
    render(<LoginForm onLogin={onLogin} onGoToRegister={jest.fn()} />);

    // Prueba
    ingresar('admin@correo.com', '123');

    // Verificación
    expect(await screen.findByText('Respuesta de servidor inválida')).toBeInTheDocument();
    expect(onLogin).not.toHaveBeenCalled();
  });

  test('un nuevo intento borra el error anterior', async () => {
    // Construcción: primero falla, después funciona
    authService.login
      .mockRejectedValueOnce({ message: 'Credenciales de Mock inválidas' })
      .mockResolvedValueOnce(RESPUESTA_OK);
    const onLogin = jest.fn();
    render(<LoginForm onLogin={onLogin} onGoToRegister={jest.fn()} />);

    // Prueba: primer intento con error
    ingresar('otro@correo.com', '999');
    expect(await screen.findByText('Credenciales de Mock inválidas')).toBeInTheDocument();

    // Prueba: segundo intento correcto
    ingresar('admin@correo.com', '123');

    // Verificación: se logueó y la alerta desapareció
    await waitFor(() => expect(onLogin).toHaveBeenCalledWith(RESPUESTA_OK));
    expect(screen.queryByText('Credenciales de Mock inválidas')).not.toBeInTheDocument();
  });

  test('"Regístrate aquí" avisa que se quiere ir al registro, sin intentar loguear', () => {
    // Construcción
    const onGoToRegister = jest.fn();
    render(<LoginForm onLogin={jest.fn()} onGoToRegister={onGoToRegister} />);

    // Prueba
    fireEvent.click(screen.getByRole('button', { name: 'Regístrate aquí' }));

    // Verificación
    expect(onGoToRegister).toHaveBeenCalledTimes(1);
    expect(authService.login).not.toHaveBeenCalled();
  });
});
