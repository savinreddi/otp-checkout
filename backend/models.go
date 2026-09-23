package main

type registerRequest struct {
	Email     string `json:"email"`
	FirstName string `json:"firstName"`
	LastName  string `json:"lastName"`
}

type registerResponse struct {
	Code string `json:"code"`
}

type checkResponse struct {
	Registered bool `json:"registered"`
}

type loginRequest struct {
	Email string `json:"email"`
	Code  string `json:"code"`
}

type loginResponse struct {
	Success   bool   `json:"success"`
	FirstName string `json:"firstName,omitempty"`
	LastName  string `json:"lastName,omitempty"`
	Message   string `json:"message,omitempty"`
}

type checkoutRequest struct {
	Email            string `json:"email"`
	Phone            string `json:"phone"`
	ShippingAddress  string `json:"shippingAddress"`
	LoggedIn         bool   `json:"loggedIn"`
}

type checkoutResponse struct {
	Success bool `json:"success"`
	ID      int  `json:"id"`
}

type errorResponse struct {
	Error string `json:"error"`
}
