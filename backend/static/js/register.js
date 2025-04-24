import { useState } from "react";

const API_BASE_URL = "http://localhost:5000";

const Register = () => {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    // const [targetCalories, setTargetCalories] = useState("");

    const handleRegister = async (event) => {
        event.preventDefault();

        try {
            const response = await fetch(`${API_BASE_URL}/auth/register`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    email,
                    password,
                    // target_calories: targetCalories,
                }),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || "Registration failed");
            }

            const data = await response.json();
            console.log("✅ Registration successful:", data);
            alert("Registration successful! You can now log in.");
            const wrapper = document.querySelector('.wrapper');
            wrapper.classList.remove('active');
        } catch (error) {
            console.error("❌ Error during registration:", error);
            alert(error.message);
        }
    };

    return (
        <form onSubmit={handleRegister}>
            <h2> Registration </h2>
            <div className="input-box">
                <span className="icon">
                    <ion-icon name="mail-outline"></ion-icon>
                </span>
                <input 
                    type="email" 
                    value={email} 
                    onChange={(e) => {
                        setEmail(e.target.value);
                        console.log("Email changed to:", e.target.value);
                    }} 
                    required 
                />
                <label> Email </label>
            </div>
            <div className="input-box">
                <span className="icon">
                    <ion-icon name="lock-closed-outline"></ion-icon>
                </span>
                <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
                <label> Password </label>
            </div>
            <div className="input-box">
                <span className="icon">
                    <ion-icon name="flame-outline"></ion-icon>
                </span>
                <input type="number" value={targetCalories} onChange={(e) => setTargetCalories(e.target.value)} required />
                <label> Target calories burned/day (kcal) </label>
            </div>
            <button type="submit" className="btn"> Register </button>
            <div className="login-register">
                <p> Already have an account? <a href="#" className="login-link"> Login </a></p>
            </div>
        </form>
    );
};

export default Register;    