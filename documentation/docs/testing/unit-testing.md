---
sidebar_position: 1
---
# Unit tests

## Unit Testing Frameworks
For the backend, we will use Pytest, a widely adopted testing framework in the Python ecosystem, due to its simplicity and powerful features. For the frontend, we will use Jest, a popular JavaScript testing framework, to test React components and JavaScript logic. FastAPI’s TestClient will also be used to test API endpoints in isolation.

## Backend Components

### API Endpoints:

Ensure that all API endpoints return the correct status codes and responses for valid and invalid inputs.

Test edge cases, such as missing required fields or invalid data types.

#### Example:
```python
    def test_register_endpoint():
        response = client.post("/register", json={
            "username": "test_user",
            "email": "test@example.com",
            "password": "securepassword123"
        })
        assert response.status_code == 200
        assert response.json() == {"message": "Account created successfully"}
```
### Database Operations:

Verify that data is correctly saved, retrieved, updated, and deleted from the database.

Test database constraints, such as unique usernames or email addresses.

#### Example:
```python
    def test_create_user():
        user = User(username="test_user", email="test@example.com", password="securepassword123")
        db.add(user)
        db.commit()
        assert db.query(User).filter(User.username == "test_user").first() is not None
```
### Business Logic:

Test core application logic, such as password hashing, validation, and video processing.

Ensure that edge cases (e.g., empty inputs, invalid formats) are handled gracefully.

#### Example:

```python
    def test_password_hashing():
        plain_password = "securepassword123"
        hashed_password = hash_password(plain_password)
        assert verify_password(plain_password, hashed_password) is True
```
## Frontend Components

### React Components:

Test that components render correctly and display the expected content.

Verify that components respond appropriately to user interactions (e.g., clicks, form submissions).

#### Example:

```javascript
    test("renders the login form", () => {
        render(<LoginForm />);
        const emailInput = screen.getByLabelText("Email");
        const passwordInput = screen.getByLabelText("Password");
        expect(emailInput).toBeInTheDocument();
        expect(passwordInput).toBeInTheDocument();
    });
```
### State Management:

Ensure that the application state updates correctly in response to user actions or API responses.

Test edge cases, such as empty states or error conditions.

#### Example:

```javascript
    test("updates state when a video is saved", () => {
        const { getByText } = render(<VideoPage />);
        fireEvent.click(getByText("Save"));
        expect(getByText("Video saved successfully")).toBeInTheDocument();
    });
```
### API Integration:

Mock API responses to test how the frontend handles success, failure, and loading states.

Ensure that the frontend correctly sends data to the backend and processes responses.

#### Example:

```javascript
    test("displays an error message when login fails", async () => {
        server.use(
            rest.post("/login", (req, res, ctx) => {
                return res(ctx.status(401), ctx.json({ error: "Invalid credentials" }));
            })
        );

        render(<LoginForm />);
        fireEvent.click(screen.getByText("Login"));
        const errorMessage = await screen.findByText("Invalid credentials");
        expect(errorMessage).toBeInTheDocument();
    });
```