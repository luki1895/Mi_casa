import assert from "node:assert/strict";
import test from "node:test";
import {
    isInvalidSessionResponse,
    notifyInvalidSession,
    SESSION_INVALID_EVENT,
} from "./sessionEvents.js";

test("invalida la sesión ante un 401 protegido, pero no ante un login rechazado", () => {
    assert.equal(
        isInvalidSessionResponse({ config: { url: "/api/caja/panel" }, response: { status: 401 } }),
        true,
    );
    assert.equal(
        isInvalidSessionResponse({ config: { url: "/api/auth/login" }, response: { status: 401 } }),
        false,
    );
    assert.equal(
        isInvalidSessionResponse({ config: { url: "/api/caja/panel" }, response: { status: 403 } }),
        false,
    );
});

test("notifica cuando el backend rechaza una sesión", () => {
    const originalWindow = globalThis.window;
    const eventTarget = new EventTarget();
    let notified = false;
    eventTarget.addEventListener(SESSION_INVALID_EVENT, () => {
        notified = true;
    });

    try {
        globalThis.window = eventTarget;
        notifyInvalidSession();
        assert.equal(notified, true);
    } finally {
        if (originalWindow === undefined) {
            delete globalThis.window;
        } else {
            globalThis.window = originalWindow;
        }
    }
});
