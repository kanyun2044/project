const API_URL = process.env.NEXT_PUBLIC_API_URL;

export async function apiFetch(
  path: string,
  options: RequestInit = {},
) {
  let response = await fetch(`${API_URL}${path}`, {
    ...options,
    credentials: "include",
  });

  if (response.status !== 401) {
    return response;
  }

  const refreshResponse = await fetch(
    `${API_URL}/auth/refresh`,
    {
      method: "POST",
      credentials: "include",
    },
  );

  if (!refreshResponse.ok) {
    window.location.href = "/login";
    return response;
  }

  response = await fetch(`${API_URL}${path}`, {
    ...options,
    credentials: "include",
  });

  return response;
}