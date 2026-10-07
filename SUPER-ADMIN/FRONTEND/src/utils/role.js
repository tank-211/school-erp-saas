// Only a Super Admin may change anything in the Control Portal; other staff
// roles (support, billing…) can look. The server enforces this on every
// request; this only decides what the screen offers.
export const currentStaffRole = () => {
  try {
    return JSON.parse(localStorage.getItem('spUser') || '{}')?.internal_role || '';
  } catch {
    return '';
  }
};

export const isSuperAdmin = () => currentStaffRole() === 'super_admin';

export const VIEW_ONLY_HINT = 'Only a Super Admin can make changes';
