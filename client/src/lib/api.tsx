// Use a deploy-time API URL in cloud environments, but keep localhost as the dev fallback.
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:5001/api";
const AUTH_TOKEN_KEY = "inventiq_auth_token";
const AUTH_REDIRECT_EVENT = "inventiq:auth-expired";

//type => data expected from backend

type HttpMethod = "GET" | "POST" | "PATCH" | "DELETE";

type RequestOptions = {
  method?: HttpMethod;
  body?: unknown;
  authenticated?: boolean;
};

type SuccessMessage = {
  message: string;
};

type LoginResponse = {
  token: string;
};

export type ProductDto = {
  product_code: string;
  name: string;
  description: string | null;
  weight: number;
  price: number;
  quantity: number;
  last_updated: string;
};

export type CustomerDto = {
  customer_id: string;
  name: string;
  contact: string;
  address: string;
};

export type SupplierDto = {
  supplier_id: string;
  name: string;
  contact: string;
  address: string;
};

export type OrderLineDto = {
  product_code: string;
  quantity: number;
  unit_price?: number;
};

export type OrderDto = {
  order_id: string;
  type: "sale" | "purchase";
  products: OrderLineDto[];
  status: string;
  date: string;
  notes: string | null;
  customer_id: string | null;
  supplier_id: string | null;
  customer?: {
    customer_id: string;
    name: string;
    contact: string;
    address: string;
  } | null;
  supplier?: {
    supplier_id: string;
    name: string;
    contact: string;
    address: string;
  } | null;
};

export type BatchMaterialDto = {
  product_code: string;
  quantity: number;
};

export type BatchDto = {
  batch_number: string;
  raw_materials: BatchMaterialDto[];
  output: BatchMaterialDto[];
  status: string;
  start_date: string;
  end_date: string | null;
};

export type HistoryDto = {
  id: string;
  type: "Sales" | "Purchases" | "Manufacturing";
  reference: string;
  actor: string;
  status: string;
  amount: string;
  date: string;
  detail: string;
};

export type DashboardSummaryDto = {
  salesPurchasesTrend: Array<{
    label: string;
    sales: number;
    purchases: number;
  }>;
  statusPipeline: {
    sales: {
      quotation: number;
      packing: number;
      dispatch: number;
      history: number;
    };
    purchases: {
      quotations: number;
      unpaid: number;
      paid: number;
      completion: number;
      history: number;
    };
    manufacturing: {
      planned: number;
      inProgress: number;
      completed: number;
      delayed: number;
    };
  };
  topCustomers: Array<{
    name: string;
    revenue: number;
    orders: number;
  }>;
  inventoryHealth: Array<{
    label: string;
    value: number;
    tone: "amber" | "emerald" | "sky" | "rose";
  }>;
  contributionSplit: {
    customers: {
      leader: string;
      leaderValue: number;
      leaderShare: number;
      otherShare: number;
    };
    suppliers: {
      leader: string;
      leaderValue: number;
      leaderShare: number;
      otherShare: number;
    };
  };
  summaryCards: Array<{
    title: string;
    value: number;
    change: string;
    tone: "amber" | "emerald" | "sky" | "rose";
  }>;
  salesPressure: Array<{
    id: string;
    customer: string;
    amount: string;
    status: string;
    tone: "amber" | "emerald" | "sky" | "rose";
  }>;
  wipOverview: Array<{
    batch: string;
    line: string;
    completion: string;
    status: string;
    tone: "amber" | "emerald" | "sky" | "rose";
  }>;
  stockSignals: Array<{
    label: string;
    value: string;
    detail: string;
  }>;
};

export type ProductAssistantReference = {
  product_code: string;
  name: string;
  quantity: number;
  price: number;
};

export type ProductAssistantResponse = {
  answer: string;
  products: ProductAssistantReference[];
};

export type LiveChannel =
  | "products"
  | "orders"
  | "batches"
  | "history"
  | "dashboard"
  | "customers"
  | "suppliers";

export type LiveEvent = {
  action: string;
  entity: string;
  channels: LiveChannel[];
  timestamp: string;
  id?: string;
};

export type ProductUpdateInput = Partial<Pick<ProductDto, "name" | "description" | "weight" | "price" | "quantity">>;
export type OrderUpdateInput = Partial<Pick<OrderDto, "products" | "status" | "notes" | "customer_id" | "supplier_id">>;
export type BatchUpdateInput = Partial<Pick<BatchDto, "raw_materials" | "output" | "status" | "end_date">>;
export type ProductCreateInput = Pick<ProductDto, "product_code" | "name" | "description" | "weight" | "price" | "quantity">;
export type OrderCreateInput = Pick<OrderDto, "type" | "products" | "status" | "notes" | "customer_id" | "supplier_id">;
export type BatchCreateInput = Pick<BatchDto, "batch_number" | "raw_materials" | "output">;

export class AuthExpiredError extends Error {
  constructor(message = "Session expired. Please sign in again.") {
    super(message);
    this.name = "AuthExpiredError";
  }
}

//reads token from browser
const getStoredToken = () => {
  if (typeof window === "undefined") {
    return null;
  }

  return window.localStorage.getItem(AUTH_TOKEN_KEY);
};

//saves token (after login)
export const setAuthToken = (token: string) => {
  window.localStorage.setItem(AUTH_TOKEN_KEY, token);
};

//removes token (after logout)
export const clearAuthToken = () => {
  window.localStorage.removeItem(AUTH_TOKEN_KEY);
};

//returns true or false
export const isAuthenticated = () => Boolean(getStoredToken());

const redirectToLogin = (reason = "session-expired") => {
  if (typeof window === "undefined") {
    return;
  }

  const redirect = `${window.location.pathname}${window.location.search}`;
  const target = `/login?reason=${encodeURIComponent(reason)}&redirect=${encodeURIComponent(redirect)}`;

  window.dispatchEvent(new CustomEvent(AUTH_REDIRECT_EVENT));
  if (window.location.pathname !== "/login") {
    window.location.assign(target);
  }
};

//Universal API Caller
async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {

  //By default - GET request , requires login
  const { method = "GET", body, authenticated = true } = options;

  //header setup - always sending json
  const headers: HeadersInit = {
    "Content-Type": "application/json",
  };

  if (authenticated) {
    const token = getStoredToken();

    if (!token) {
      throw new Error("Authentication required");
    }

    //if logged in , attach token
    headers.Authorization = `Bearer ${token}`;
  }

  //Make a request (fetch)
  const response = await fetch(`${API_BASE_URL}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  //Handle response
  const payload = await response.json().catch(() => null);

  if (response.status === 401 && authenticated) {
    clearAuthToken();
    redirectToLogin("session-expired");
    throw new AuthExpiredError();
  }

  if (!response.ok) { //error if backend fails
    const errorMessage =
      payload && typeof payload === "object" && "error" in payload && typeof payload.error === "string"
        ? payload.error
        : "Request failed";

    throw new Error(errorMessage);
  }

  return payload as T; //returns typed data (Product[], Order[], etc.)
}

//Login Function - sends POST request , gets token from backend , stores token
export async function login(username: string, password: string) {
  const payload = await request<LoginResponse>("/auth/login", {
    method: "POST",
    body: { username, password },
    authenticated: false,
  }); //through request function

  setAuthToken(payload.token); //stores token
  return payload;
}

export const logout = async () => {
  try {
    await request<SuccessMessage>("/auth/logout", {
      method: "POST",
    });
  } catch {
    // Clearing local auth is still the safe fallback if the server cannot complete logout.
  } finally {
    clearAuthToken();
  }
};


//API functions (request) actually used in UI
//Instead of writing fetch everywhere

//calls /products & returns ProductDto[]
export const getProducts = () => request<ProductDto[]>("/products");
export const createProduct = (body: ProductCreateInput) =>
  request<ProductDto>("/products", { method: "POST", body });
export const updateProduct = (productCode: string, body: ProductUpdateInput) =>
  request<ProductDto>(`/products/${productCode}`, { method: "PATCH", body });
export const deleteProduct = (productCode: string) =>
  request<SuccessMessage>(`/products/${productCode}`, { method: "DELETE" });

//calls /orders?type=sale , /orders?type=purchase & returns OrderDto[]
export const getOrdersByType = (type: "sale" | "purchase") =>
  request<OrderDto[]>(`/orders?type=${type}`);
export const createOrder = (body: OrderCreateInput) =>
  request<OrderDto>("/orders", { method: "POST", body });
export const updateOrder = (orderId: string, body: OrderUpdateInput) =>
  request<OrderDto>(`/orders/${orderId}`, { method: "PATCH", body });
export const updateOrderStatus = (orderId: string, status: string) =>
  request<OrderDto>(`/orders/${orderId}/status`, { method: "PATCH", body: { status } });
export const deleteOrder = (orderId: string) =>
  request<SuccessMessage>(`/orders/${orderId}`, { method: "DELETE" });


export const getBatches = () => request<BatchDto[]>("/batches");
export const createBatch = (body: BatchCreateInput) =>
  request<BatchDto>("/batches", { method: "POST", body });
export const updateBatch = (batchNumber: string, body: BatchUpdateInput) =>
  request<BatchDto>(`/batches/${batchNumber}`, { method: "PATCH", body });
export const completeBatch = (batchNumber: string) =>
  request<BatchDto>(`/batches/${batchNumber}/complete`, { method: "PATCH" });
export const deleteBatch = (batchNumber: string) =>
  request<SuccessMessage>(`/batches/${batchNumber}`, { method: "DELETE" });

export const getHistory = (type: "all" | "sales" | "purchases" | "manufacturing" = "all") =>
  request<HistoryDto[]>(`/history?type=${type}`);

export const getDashboardSummary = () => request<DashboardSummaryDto>("/dashboard/summary");
export const getCustomers = () => request<CustomerDto[]>("/customers");
export const getSuppliers = () => request<SupplierDto[]>("/suppliers");
export const askProductAssistant = (question: string, selected_product_code?: string) =>
  request<ProductAssistantResponse>("/chat/products", {
    method: "POST",
    body: {
      question,
      ...(selected_product_code ? { selected_product_code } : {}),
    },
  });

export const formatCurrency = (value: number) => `Rs ${value.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

//frontend listener piece for SSE
export const subscribeToLiveEvents = (
  channels: LiveChannel[],
  onEvent: (event: LiveEvent) => void
) => {
  // The browser EventSource API cannot attach Authorization headers, so we pass the JWT as a query param.
  const token = getStoredToken();

  if (!token || typeof window === "undefined") {
    return () => undefined;
  }

  const params = new URLSearchParams({ //Builds query params as expected by backend
    token,
    channels: channels.join(","),
  });

  //opens the live SSE connection
  //not a normal fetch request instead a long-lived open connection where the server keeps sending messages over time
  const eventSource = new EventSource(`${API_BASE_URL}/events/stream?${params.toString()}`);

  //runs every time the server sends an SSE message
  eventSource.onmessage = (message) => {
    try {
      const payload = JSON.parse(message.data) as LiveEvent; //converting string data sent by server back into JS object

      // Ignore the initial handshake event and only surface real data-change events.
      if (payload.action !== "connected") {
        onEvent(payload);
      }
    } catch {
      // Ignore malformed keepalive events.
    }
  };

  eventSource.onerror = () => {
    eventSource.close();
  };

  return () => {
    eventSource.close(); //cleanup , important for React , When component unmounts - connection close so no memory leaks
  };
};
