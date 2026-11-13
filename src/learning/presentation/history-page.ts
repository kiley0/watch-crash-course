import Alpine from "@alpinejs/csp";
import "../../site/styles.css";
import "./history.css";
import { createHistoryPage } from "./history-component";

Alpine.data("historyPage", createHistoryPage);
Alpine.start();
