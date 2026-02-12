# Private Account with Public Posts
I have updated the privacy logic to support **Mixed Visibility** on Private Accounts.

## Changes
1.  **Backend (`getUserPosts`)**:
    *   Previously: Private accounts returned an empty list to non-followers.
    *   Now: Non-followers (strangers) get a filtered list containing **only 'public' posts**.
    *   'Followers-only' posts remain hidden to strangers.

2.  **Frontend (`Profile.jsx`)**:
    *   Updated the "Lock Screen" condition.
    *   It now only shows the Lock Screen if the user is Private, you are not following, AND there are **no public posts available**.
    *   If there are public posts, the grid renders them normally.

## How to Test
1.  **Preparation**:
    *   Log in as User A.
    *   Set account to **Private** (Edit Profile -> Private Account).
    *   create a new post with Visibility: **Public**.
    *   create another post with Visibility: **Followers** (or just Private).

2.  **Verification**:
    *   Log in as User B (a stranger, not following User A).
    *   Visit User A's profile.
    *   **Result**: 
        *   You should SEE the **Public** post in the grid.
        *   You should NOT see the **Followers** post.
        *   You should NOT see the big "Lock Screen" (unless User A has ZERO public posts).
