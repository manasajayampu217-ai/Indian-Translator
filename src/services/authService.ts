export interface User {
  email: string;
  name: string;
}

interface RegisteredUser {
  email: string;
  name: string;
  password: string;
  createdAt: string;
}

export class AuthService {
  private static readonly STORAGE_KEY = 'indiantranslator_user';
  private static readonly USERS_KEY = 'indiantranslator_registered_users';

  static saveUser(user: User): void {
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(user));
  }

  static getUser(): User | null {
    const userData = localStorage.getItem(this.STORAGE_KEY);
    if (userData) {
      try {
        return JSON.parse(userData);
      } catch {
        return null;
      }
    }
    return null;
  }

  static logout(): void {
    localStorage.removeItem(this.STORAGE_KEY);
  }

  static isLoggedIn(): boolean {
    return this.getUser() !== null;
  }

  // Get all registered users
  private static getRegisteredUsers(): RegisteredUser[] {
    const usersData = localStorage.getItem(this.USERS_KEY);
    if (usersData) {
      try {
        return JSON.parse(usersData);
      } catch {
        return [];
      }
    }
    return [];
  }

  // Save registered users
  private static saveRegisteredUsers(users: RegisteredUser[]): void {
    localStorage.setItem(this.USERS_KEY, JSON.stringify(users));
  }

  // Check if email already exists
  static isEmailRegistered(email: string): boolean {
    const users = this.getRegisteredUsers();
    return users.some(user => user.email.toLowerCase() === email.toLowerCase());
  }

  // Register new user
  static register(email: string, name: string, password: string): { success: boolean; message: string } {
    // Check if email already exists
    if (this.isEmailRegistered(email)) {
      return {
        success: false,
        message: 'This email is already registered. Please login instead.'
      };
    }

    // Add new user to registered users
    const users = this.getRegisteredUsers();
    const newUser: RegisteredUser = {
      email,
      name,
      password, // In production, this should be hashed
      createdAt: new Date().toISOString()
    };
    users.push(newUser);
    this.saveRegisteredUsers(users);

    // Auto-login the user
    this.saveUser({ email, name });

    return {
      success: true,
      message: 'Account created successfully!'
    };
  }

  // Login user
  static login(email: string, password: string): { success: boolean; message: string; user?: User } {
    const users = this.getRegisteredUsers();
    const user = users.find(u => 
      u.email.toLowerCase() === email.toLowerCase() && u.password === password
    );

    if (user) {
      this.saveUser({ email: user.email, name: user.name });
      return {
        success: true,
        message: 'Login successful!',
        user: { email: user.email, name: user.name }
      };
    }

    return {
      success: false,
      message: 'Invalid email or password'
    };
  }
}
