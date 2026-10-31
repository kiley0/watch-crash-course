import Alpine from "@alpinejs/csp";
import "../../site/styles.css";
import "./catalog.css";
import { createCatalogPage } from "./catalog-component";
Alpine.data("catalogPage", () => createCatalogPage("study-hall"));
Alpine.start();
