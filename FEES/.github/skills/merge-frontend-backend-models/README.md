# Merge Frontend-Backend Models Skill

## Analysis Complete ✓

**Target Model**: `User`  
**Status**: Ready for Implementation  
**Effort**: 2.5 hours  
**Risk**: Low (additive changes)

---

## Findings

### Backend User Model
✅ **Production-Ready**
- Mongoose schema with validation (email/phone unique, password min 6)
- Joi validators for login, create, update operations
- All required fields present: `name`, `email`, `phone`, `password`, `role`, `department`, `isActive`, `lastLogin`, `refreshTokens`

### Frontend User Model
⚠️ **Missing**
- No TypeScript types defined
- No form validators (Zod/Yup)
- Hardcoded values in components (e.g., `const userName = "Admin User"`)
- No auth context or session management

---

## Deliverables Created

### 1. Canonical Model Contract
📄 **File**: `.github/skills/merge-frontend-backend-models/canonical/User.md`

Defines the unified User model with:
- Field-by-field specification (types, required, unique, defaults)
- Backend Mongoose schema (exact code)
- Frontend TypeScript interface
- Zod validation schema
- API contract and response formats
- Breaking changes & migration notes

### 2. Migration Plan
📄 **File**: `.github/skills/merge-frontend-backend-models/PLAN.md`

Step-by-step implementation guide:
- **Phase 1**: Frontend type definitions (`user.ts`, `userValidator.ts`)
- **Phase 2**: API integration (`apiService.js` additions, `AuthContext.jsx`)
- **Phase 3**: Component updates (Login page, Navbar, Sidebar)
- **Phase 4**: Backend verification (no changes needed ✓)
- **Phase 5**: Testing (unit + integration)

Includes:
- Exact code snippets for each file
- Checklists for QA verification
- Timeline (2.5 hours total)
- Rollback plan
- Testing strategies

---

## Key Insights

| Aspect | Backend | Frontend | Gap |
|--------|---------|----------|-----|
| **Schema** | ✓ Mongoose | ✗ None | Need TypeScript types |
| **Validators** | ✓ Joi | ✗ None | Need Zod schemas |
| **Auth Endpoints** | ✓ /auth/login, /auth/logout | ✗ Not integrated | Need API functions |
| **Session Mgmt** | ✓ JWT + refreshTokens | ✗ None | Need AuthContext |
| **User Data** | ✓ DB-backed | ✗ Hardcoded | Need API integration |

---

## No Breaking Changes Required

The backend is already compliant with the canonical contract. Frontend changes are purely **additive**:
- Add TypeScript types
- Add form validators
- Add API service functions
- Add auth context and providers
- Update components to use new types

---

## Next Steps

1. **Review** the canonical contract: `.github/skills/merge-frontend-backend-models/canonical/User.md`
2. **Review** the migration plan: `.github/skills/merge-frontend-backend-models/PLAN.md`
3. **Implement** Phase 1–3 following the exact code snippets provided
4. **Test** using the provided unit and integration test templates
5. **Deploy** and verify no console errors or API failures

---

## Usage Examples

Once implemented, the frontend will support:

### Login Example
```jsx
import { useAuth } from './context/AuthContext';
import { loginUser } from './services/apiService';

function LoginPage() {
  const { login } = useAuth();
  
  const handleLogin = async (email, password) => {
    const { success, user, token } = await loginUser(email, password);
    if (success) {
      login(user, token);
      navigate('/dashboard');
    }
  };
}
```

### Component Usage
```jsx
function Navbar() {
  const { user, logout } = useAuth();
  
  return (
    <nav>
      <span>{user?.name} ({user?.role})</span>
      <button onClick={logout}>Logout</button>
    </nav>
  );
}
```

### Type Safety
```typescript
// All user data is type-checked
const userData: User = {
  id: '507f1f77bcf86cd799439011',
  name: 'John Admin',
  email: 'admin@example.com',
  phone: '9876543210',
  role: 'admin', // Type: 'admin' | 'accountant' | 'staff'
  department: 'accounts', // Type: 'accounts' | 'administration' | 'support'
  isActive: true,
  createdAt: '2026-06-18T10:00:00Z',
  updatedAt: '2026-06-18T12:30:00Z'
};
```

---

## Customization & Enhancement Ideas

- **Add automated test generator**: Script to scaffold Vitest/Jest tests
- **Add code codemod**: Automated renaming across codebase if enum values change
- **Add migration script**: TypeScript transformer for bulk type updates
- **Add storybook**: Component stories for Login, UserForm, AuthFlow
- **Add ESLint rule**: Warn if User types are used before canonical contract
- **Add OpenAPI spec generator**: Auto-generate API docs from types

---
