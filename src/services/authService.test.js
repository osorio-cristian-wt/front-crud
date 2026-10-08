// Tests unitarios de authService.
// La API (cliente axios de ./api) se reemplaza por un mock de Jest, así que no hace falta
// backend ni base de datos: cada test decide qué "responde el servidor".
jest.mock('./api', () => ({
  __esModule: true,
  default: { post: jest.fn() },
}));

// USE_MOCK se lee cuando se carga el módulo, por eso se carga authService
// de nuevo en cada test con la variable REACT_APP_USE_MOCK que corresponda.
const cargarServicio = (usarMock) => {
  process.env.REACT_APP_USE_MOCK = usarMock ? 'true' : 'false';
  let modulos;
  jest.isolateModules(() => {
    modulos = {
      authService: require('./authService').authService,
      api: require('./api').default,
    };
  });
  return modulos;
};

const ENV_ORIGINAL = process.env.REACT_APP_USE_MOCK;

beforeEach(() => {
  localStorage.clear();
  sessionStorage.clear();
  jest.clearAllMocks();
  jest.spyOn(console, 'log').mockImplementation(() => {});
  jest.spyOn(console, 'warn').mockImplementation(() => {});
});

afterEach(() => {
  jest.useRealTimers();
  jest.restoreAllMocks();
});

afterAll(() => {
  process.env.REACT_APP_USE_MOCK = ENV_ORIGINAL;
});

describe('authService.login contra la API (API mockeada)', () => {
  test('login correcto: envía POST /login y guarda el usuario y el token', async () => {
    // Construcción: la API falsa responde éxito
    const { authService, api } = cargarServicio(false);
    const respuesta = { success: true, accessToken: 'jwt-123', user: { name: 'Ana', role: 'admin' } };
    api.post.mockResolvedValue({ data: respuesta });

    // Prueba
    const resultado = await authService.login('ana@correo.com', 'secreta');

    // Verificación: llamada correcta, devuelve lo de la API y guarda la sesión
    expect(api.post).toHaveBeenCalledWith('/login', { email: 'ana@correo.com', password: 'secreta' });
    expect(resultado).toEqual(respuesta);
    expect(JSON.parse(localStorage.getItem('userData'))).toEqual(respuesta.user);
    expect(sessionStorage.getItem('session_id')).toBe('jwt-123');
  });

  test('respuesta sin success: devuelve la respuesta pero no guarda sesión', async () => {
    // Construcción
    const { authService, api } = cargarServicio(false);
    api.post.mockResolvedValue({ data: { success: false } });

    // Prueba
    const resultado = await authService.login('ana@correo.com', 'mala');

    // Verificación
    expect(resultado).toEqual({ success: false });
    expect(localStorage.getItem('userData')).toBeNull();
    expect(sessionStorage.getItem('session_id')).toBeNull();
  });

  test('la API responde con error (ej. 401): se propaga el cuerpo del error', async () => {
    // Construcción: axios rechaza con una respuesta del servidor
    const { authService, api } = cargarServicio(false);
    api.post.mockRejectedValue({ response: { status: 401, data: { message: 'Usuario o contraseña incorrectos' } } });

    // Prueba y verificación
    await expect(authService.login('ana@correo.com', 'mala'))
      .rejects.toEqual({ message: 'Usuario o contraseña incorrectos' });
    expect(localStorage.getItem('userData')).toBeNull();
  });

  test('sin conexión (no hay respuesta del servidor): error "Error de conexión con la API"', async () => {
    // Construcción: axios rechaza sin response (red caída)
    const { authService, api } = cargarServicio(false);
    api.post.mockRejectedValue(new Error('Network Error'));

    // Prueba y verificación
    await expect(authService.login('ana@correo.com', 'x'))
      .rejects.toThrow('Error de conexión con la API');
  });
});

describe('authService.login en modo mock (REACT_APP_USE_MOCK=true)', () => {
  test('admin@correo.com / 123 resuelve con el usuario de prueba y no llama a la API', async () => {
    // Construcción: relojes falsos para no esperar el segundo del setTimeout
    jest.useFakeTimers();
    const { authService, api } = cargarServicio(true);

    // Prueba
    const promesa = authService.login('admin@correo.com', '123');
    jest.advanceTimersByTime(1000);
    const resultado = await promesa;

    // Verificación
    expect(resultado.success).toBe(true);
    expect(resultado.user.name).toBe('Usuario de Prueba');
    expect(resultado.user.role).toBe('admin');
    expect(JSON.parse(localStorage.getItem('userData')).name).toBe('Usuario de Prueba');
    expect(api.post).not.toHaveBeenCalled();
  });

  test('credenciales incorrectas rechazan con "Credenciales de Mock inválidas"', async () => {
    // Construcción
    jest.useFakeTimers();
    const { authService } = cargarServicio(true);

    // Prueba
    const promesa = authService.login('admin@correo.com', 'otra');
    jest.advanceTimersByTime(1000);

    // Verificación
    await expect(promesa).rejects.toEqual({ message: 'Credenciales de Mock inválidas' });
    expect(localStorage.getItem('userData')).toBeNull();
  });
});

describe('authService.logout', () => {
  test('borra los datos de sesión del localStorage', () => {
    // Construcción
    const { authService } = cargarServicio(false);
    localStorage.setItem('userData', '{"name":"Ana"}');
    localStorage.setItem('token', 'abc');

    // Prueba
    authService.logout();

    // Verificación
    expect(localStorage.getItem('userData')).toBeNull();
    expect(localStorage.getItem('token')).toBeNull();
  });
});
