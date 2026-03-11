declare global {
    interface RequestInit {
        method?: "get" | "post" | "patch" | "put" | "delete";
    }
}
