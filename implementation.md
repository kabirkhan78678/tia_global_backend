# Tia Global Backend Implementation & Analysis

This file tracks all modifications, analyses, and implementation steps completed in the project.

---

## 📅 July 10, 2026

### 1. Analysis of Parent & Child Approval Flow

We checked the codebase for the admin approval functionality when a parent/teacher signs up or a child (student) is added. Here are the findings:

#### A. Signup & Initial Status (Pending)
* **Parent Signup:** In [auth.service.js](file:///E:/Yogesh-CTI/tia_global/tia_global_backend/src/modules/users/auth/auth.service.js#L97-L166), when a parent signs up, their account is created via `AuthModel.createParent` with a default `approval_status = 'pending'`.
* **Child (Student) Signup/Addition:**
  * When a parent signs up with children, or adds a child later using the `POST /users/auth/students` route, the child is created via `AuthModel.createStudent` with a default `status = 'pending'` and `password = null`.

#### B. Admin Approval Routes
The admin endpoints are defined in [admin.users.routes.js](file:///E:/Yogesh-CTI/tia_global/tia_global_backend/src/modules/admin/users/admin.users.routes.js):
* **Parent Approval:** `PATCH /admin/parents/:id/status` -> Updates the parent's approval status (`pending`, `active`, `inactive`).
* **Student Approval:** `PATCH /admin/students/:id/status` -> Updates the student's status.
* **General User Approval:** `PATCH /admin/users/:userId/approval` -> Can change a parent or teacher's approval status.

#### C. Approval Logic & Actions
* **For Parent:** The status is updated to `active` via [admin.users.service.js](file:///E:/Yogesh-CTI/tia_global/tia_global_backend/src/modules/admin/users/admin.users.service.js#L132-L158). The parent logs in using the password they set during signup.
* **For Student:** If a student's status is updated to `active` and they don't have a password yet:
  1. The system generates a temporary password using `generateTemporaryPassword()`.
  2. The password is encrypted and saved to the student record (`is_password_generated` is set to `1`).
  3. An email (`sendStudentApprovedEmail`) containing the temporary password is sent to the student.

---

### 2. Implementation: Parent & Child Cascaded Approval

We have successfully implemented the cascaded approval behavior according to **Option A**:
* **Approve Child:** Automatically activates the associated parent (allowing both to log in), leaving sibling children in pending state.
* **Approve Parent:** Automatically activates the parent and **all** linked pending children (generating passwords and sending credentials emails to all of them).

#### Code Modifications

##### A. [admin.users.model.js](file:///E:/Yogesh-CTI/tia_global/tia_global_backend/src/modules/admin/users/admin.users.model.js)
Added queries to retrieve linked parents and sibling children:
* `findParentByStudentId(studentId)`:
  ```javascript
  exports.findParentByStudentId = async (studentId) => {
    const [rows] = await pool.execute(
      `
        SELECT u.id, u.role, u.first_name, u.last_name, u.phone, u.email, u.profile_image, u.approval_status, u.created_at
        FROM parent_students ps
        INNER JOIN users u ON u.id = ps.parent_id
        WHERE ps.student_id = ?
          AND u.role = 'parent'
        LIMIT 1
        `,
      [studentId]
    );
    return rows[0] || null;
  };
  ```
* `findStudentsByParentId(parentId)`:
  ```javascript
  exports.findStudentsByParentId = async (parentId) => {
    const [rows] = await pool.execute(
      `
        SELECT
          s.id,
          s.first_name,
          s.last_name,
          s.dob,
          s.grade_level,
          s.academy,
          s.email,
          s.status,
          s.password,
          s.profile_image,
          s.is_first_login,
          s.first_login_at,
          s.is_password_generated
        FROM parent_students ps
        INNER JOIN students s ON s.id = ps.student_id
        WHERE ps.parent_id = ?
        `,
      [parentId]
    );
    return rows;
  };
  ```

##### B. [admin.users.service.js](file:///E:/Yogesh-CTI/tia_global/tia_global_backend/src/modules/admin/users/admin.users.service.js)
* Added the `activateParentChildren` helper:
  ```javascript
  const activateParentChildren = async (parentId) => {
    const students = await AdminUsersModel.findStudentsByParentId(parentId);
    for (const student of students) {
      if (student.status !== 'active' || !student.password) {
        const temporaryPassword = generateTemporaryPassword();
        const hashedPassword = await bcrypt.hash(temporaryPassword, 10);

        await AdminUsersModel.updateStudentApproval({
          studentId: student.id,
          status: 'active',
          password: hashedPassword,
        });

        await sendAdminEmail(() =>
          sendStudentApprovedEmail({
            to: student.email,
            password: temporaryPassword,
          })
        );
      }
    }
  };
  ```
* Updated `updateStudentStatus` to cascade parent activation when a child is activated:
  ```javascript
  // When student status is set to active:
  const parent = await AdminUsersModel.findParentByStudentId(studentId);
  if (parent && parent.approval_status !== 'active') {
    await AdminUsersModel.updateApprovalStatus({
      userId: parent.id,
      role: 'parent',
      status: 'active',
    });
  }
  ```
* Updated `updateParentStatus` and `updateApprovalStatus` to cascade child activation when the parent is activated:
  ```javascript
  if (status === 'active') {
    await activateParentChildren(parentId);
  }
  ```

---

### 3. Forgot Password Email Design Upgrade

We updated the forgot password email templates to use a modern, clean HTML design instead of plain text:
* **File Modified:** [email.service.js](file:///E:/Yogesh-CTI/tia_global/tia_global_backend/src/services/email.service.js)
* **Changes:**
  * Updated `sendPasswordResetLinkEmail` and `sendAdminPasswordResetLinkEmail` functions.
  * Formatted the link expiration timestamp into a local, human-readable date/time string (e.g., `"Jul 10, 2026, 6:02 PM"`).
  * Embedded the official logo from `public/Tarbiytul ilm logo 1.png` using inline CID attachment (`cid:tialogo`) so that it displays natively inside all mail applications without requiring external hosting.
  * Arranged the logo image and brand name side-by-side horizontally using a robust email-safe table layout.
  * Colored the text and action button in TIA Global's brand orange (`#ff7a00`) and styled the button as a rounded pill matching the website theme.
  * Formatted background to match the cream/beige color tone (`#fbf5ee`).

---

### 4. Adjustments to `is_password_generated` Flag Behavior

We configured the password setup flag flow as requested (reversed behavior):
* **Files Modified:**
  * [admin.users.model.js](file:///E:/Yogesh-CTI/tia_global/tia_global_backend/src/modules/admin/users/admin.users.model.js)
  * [auth.model.js](file:///E:/Yogesh-CTI/tia_global/tia_global_backend/src/modules/users/auth/auth.model.js)
  * [auth.service.js](file:///E:/Yogesh-CTI/tia_global/tia_global_backend/src/modules/users/auth/auth.service.js)
* **Changes:**
  * In `AdminUsersModel.updateStudentApproval` (during admin activation with a temporary password), we set `is_password_generated = 0` so that logging in with the temporary password returns `isPasswordGenerated: false` (directing them to set their password).
  * In `AuthModel.createStudentPassword` (when the student sets their custom password), we set `is_password_generated = 1` in the database.
  * In `authService.createStudentPassword`, the response returns `isPasswordGenerated: true` indicating setup is completed.





