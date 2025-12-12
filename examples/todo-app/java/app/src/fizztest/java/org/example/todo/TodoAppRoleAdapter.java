package org.example.todo;

import com.microsoft.playwright.*;
import com.microsoft.playwright.options.AriaRole;

import io.fizzbee.mbt.types.Arg;

import java.util.*;

/**
 * TodoAppRoleAdapter implements the TodoAppRole interface using Playwright to interact with the web application.
 * <p>
 * It provides methods to create, read, update, delete, list, pin, and unpin todo items in the application.
 * <p>
 * The login/logout are not part of the model. So, we login once, and keep the session for the lifetime of this adapter.
 * This is to avoid login/logout overhead for each test action.
 *
 *
 */
public class TodoAppRoleAdapter implements TodoAppRole {

    public static final String TITLE_PREFIX = "Sample Title ";
    public static final String DESCRIPTION_PREFIX = "Some Description ";

    private Playwright playwright;
    private Browser browser;
    private BrowserContext context;
    private Page page;

    public TodoAppRoleAdapter() {
        // initialize Playwright and login
        if (playwright == null) {
            playwright = Playwright.create();
            Runtime.getRuntime().addShutdownHook(new Thread(() -> {
                if (playwright != null) playwright.close();
            }));
        }
        if (browser == null) {
            // For debugging, you can disable headless mode and slow down operations
            browser = playwright.chromium().launch(
                    new BrowserType.LaunchOptions()
//                            .setHeadless(false)
//                            .setSlowMo(400)
            );
        }
        if (context == null) {
            // For debugging, you can enable video recording
            context = browser.newContext(
//                    new Browser.NewContextOptions()
//                            .setRecordVideoDir(Paths.get("/tmp/playwright-videos/"))      // Where to store videos
//                            .setRecordVideoSize(1280, 720)
            );
        }
        page = context.newPage();
        page.navigate("http://localhost:9100/");

        // login as fizzbee@example.org / FizzBeeRocks
        page.getByRole(AriaRole.TEXTBOX, new Page.GetByRoleOptions().setName("Email")).click();
        page.getByRole(AriaRole.TEXTBOX, new Page.GetByRoleOptions().setName("Email")).fill("fizzbee@example.org");
        page.getByRole(AriaRole.TEXTBOX, new Page.GetByRoleOptions().setName("Password")).fill("FizzBeeRocks");
        page.getByRole(AriaRole.BUTTON, new Page.GetByRoleOptions().setName("Sign In")).click();

        // optionally wait for landing UI; simple wait for the "Take a note..." textbox to appear
        page.getByRole(AriaRole.TEXTBOX, new Page.GetByRoleOptions().setName("Take a note...")).waitFor();
    }

    @Override
    public Object actionCreateTodo(Arg[] args) {
        String val = (String) args[0].value();
        String title = TITLE_PREFIX + val;
        String content = DESCRIPTION_PREFIX + val;

        page.getByRole(AriaRole.TEXTBOX,
                new Page.GetByRoleOptions().setName("Take a note...")).fill(title);
        page.getByRole(AriaRole.TEXTBOX,
                new Page.GetByRoleOptions().setName("Content...")).fill(content);

        Locator addButton = page.getByRole(AriaRole.BUTTON,
                new Page.GetByRoleOptions().setName("Add"));

        // Wait for the UI to reflect the new changes
        clickAndWaitForListDomUpdate(addButton);

        // no specific return value expected; return null
        return null;
    }

    @Override
    public Object actionReadTodo(Arg[] args) {
//        System.out.println("Reading todo with args: " + Arrays.toString(args));
        int id = getTodoId(args[0]);

        // Open the modal for this todo
        Locator card = page.getByTestId("todo-card-" + id);
        if (card.count() == 0 || !card.isVisible()) {
            // Todo not found; return null
            return null;
        }
        card.click();

        // Wait for modal and read its contents
        Locator modal = page.locator("#todoModalContent");
        modal.waitFor();

        String title = modal.getByTestId("todo-title").textContent();

        // Extract the "value" back from the title (if it follows "Sample Title X")
        String value = getValueFromTitle(title);

        Locator pinIcon = modal.locator("i.bi-pin, i.bi-pin-fill");
        boolean pinned = pinIcon.count() > 0 && pinIcon.first().getAttribute("class").contains("bi-pin-fill");

        // Build result
        Map<String, Object> result = new TreeMap<>();
        result.put("id", id);
        result.put("value", value);
        result.put("deleted", Boolean.FALSE);
        result.put("pinned", pinned);

        // Close modal
        page.getByRole(AriaRole.BUTTON, new Page.GetByRoleOptions().setName("")).click();

        return toFizzBeeFormat(result);
    }

    @Override
    public Object actionUpdateTodo(Arg[] args) {
        safeRun("updateTodo", () -> {
            int todoId = getTodoId(args[0]);
            Locator card = hoverOnCard(todoId);
            if (card == null) return;

            // Open the edit UI
            page.getByTestId("edit-todo-" + todoId).click();

            // Prepare new values
            String val = args[1].value().toString();
            Locator updateBtn = page.getByRole(AriaRole.BUTTON, new Page.GetByRoleOptions().setName("Update"));
            updateBtn.waitFor();

            page.getByRole(AriaRole.TEXTBOX, new Page.GetByRoleOptions().setName("Take a note..."))
                    .fill(TITLE_PREFIX + val);
            page.getByRole(AriaRole.TEXTBOX, new Page.GetByRoleOptions().setName("Content..."))
                    .fill(DESCRIPTION_PREFIX + val);

            // Wait for the UI to reflect the new changes
            clickAndWaitForListDomUpdate(updateBtn);
        });

        return null;
    }

    @Override
    public Object actionDeleteTodo(Arg[] args) {
        safeRun("deleteTodo", () -> {
            int id = getTodoId(args[0]);
            Locator card = hoverOnCard(id);
            if (card == null) return;

            Locator del = page.getByTestId("delete-todo-" + id);
            page.onceDialog(Dialog::accept);
            clickAndWaitForListDomUpdate(del);
        });
        return null;
    }

    @Override
    public Object actionListTodo(Arg[] args) {
        List<Map<String, Object>> results = new ArrayList<>();
        Locator cards = page.locator("[data-testid^='todo-card-']");
        for (int i = 0; i < cards.count(); i++) {
            Locator card = cards.nth(i);
            results.add(extractTodo(card));
        }
        // sort by id
        results.sort(Comparator.comparingInt(m -> (Integer) m.get("id")));
        return toFizzBeeFormat(results);
    }

    private static Map<String, Object> extractTodo(Locator card) {
        String testid = card.getAttribute("data-testid");
        // testid expected like todo-card-2
        String[] parts = testid.split("-");
        int id = Integer.parseInt(parts[parts.length - 1]);

        String value = getValueFromTitle(card.getByTestId("todo-title-" + id).textContent());

        String cls = card.getAttribute("class");
        boolean pinned = (cls != null && cls.contains("pinned"));

        Map<String, Object> m = new TreeMap<>();
        m.put("id", id);
        m.put("value", value);
        m.put("deleted", Boolean.FALSE);
        m.put("pinned", pinned);
        return m;
    }

    @Override
    public Object actionPinTodo(Arg[] args) {
        safeRun("pinTodo", () -> {
            int id = getTodoId(args[0]);
            Locator card = hoverOnCard(id);
            if (card == null) return;

            Locator pin = page.getByTestId("pin-todo-" + id);
            if (pin.count() == 0) {
                return;
            }
            pinAndWaitForListDomUpdate(pin, id);
        });
        return null;
    }

    @Override
    public Object actionUnPinTodo(Arg[] args) {
        safeRun("unpinTodo", () -> {
            int id = getTodoId(args[0]);
            Locator card = hoverOnCard(id);
            if (card == null) return;

            Locator unpin = page.getByTestId("unpin-todo-" + id);
            if (unpin.count() == 0) {
                return;
            }
            clickAndWaitForListDomUpdate(unpin);
        });
        return null;
    }

    /**
     * Clicks the given button and waits for the todo list DOM to update,
     * indicated by a change in the #todoUpdateCounter element's text content, to ensure that the UI has
     * reflected changes after actions like create, update, delete, pin, or unpin.
     * <p>
     * Without this, tests may proceed before the UI is updated, leading to flaky tests, while avoiding
     * the unnecessary timed wait (or slow mo) for specific API responses.
     * There by, improving test speed and reliability.
     * @param btn
     */
    private void clickAndWaitForListDomUpdate(Locator btn) {
        String before = page.locator("#todoUpdateCounter").textContent();
        btn.click();
        page.waitForFunction(
                "prev => document.getElementById('todoUpdateCounter').textContent !== prev",
                before);
    }

    /**
     * Pin flow helper that waits for the PATCH /pin request to complete,
     * and only waits for the UI update if the PATCH request succeeded.
     * <p>
     * The pin action will return 400 if there is an item already pinned (only one item can be pinned at a time).
     */
    private void pinAndWaitForListDomUpdate(Locator btn, int todoId) {
        // --- 1. Read counter before click ---
        String before = page.locator("#todoUpdateCounter").textContent();

        // --- 2. Wait for PATCH /pin triggered by click ---
        Response patchResponse = page.waitForResponse(
                r -> r.url().contains("/todos/" + todoId + "/pin")
                        && r.request().method().equals("PATCH"),
                btn::click
        );

        // --- 3. Only wait for UI update if PATCH succeeded ---
        if (patchResponse.ok()) {
            page.waitForFunction(
                    "prev => document.getElementById('todoUpdateCounter').textContent !== prev",
                    before
            );
        }
    }


    private Locator hoverOnCard(int id) {
        Locator card = page.getByTestId("todo-card-" + id);
        if (card.count() == 0 || !card.isVisible()) {
            return null;
        }
        card.hover();
        return card;
    }

    private static int getTodoId(Arg arg) {
        Object idVal = arg.value();
        int id = (idVal instanceof Number) ? ((Number) idVal).intValue() : Integer.parseInt(idVal.toString());
        return id;
    }

    private static String getValueFromTitle(String originalTitle) {
        String title = originalTitle != null ? originalTitle.trim() : "";
        if (title.startsWith(TITLE_PREFIX)) {
            return title.substring(TITLE_PREFIX.length()).trim();
        }
        return title;
    }

    private static String toFizzBeeFormat(List<Map<String, Object>> records) {
        StringBuilder sb = new StringBuilder();
        sb.append("[");

        for (int i = 0; i < records.size(); i++) {
            Map<String, Object> record = records.get(i);
            toFizzBeeFormat(sb, record);
            if (i < records.size() - 1) {
                sb.append(", ");
            }
        }

        sb.append("]");
        return sb.toString();
    }

    private static String toFizzBeeFormat(Map<String, Object> record) {
        StringBuilder sb = new StringBuilder();
        toFizzBeeFormat(sb, record);
        return sb.toString();
    }

    private static void toFizzBeeFormat(StringBuilder sb, Map<String, Object> record) {
        sb.append("record(");

        int j = 0;
        for (Map.Entry<String, Object> entry : record.entrySet()) {
            String key = entry.getKey();
            Object value = entry.getValue();

            sb.append(key).append(" = ");
            if (value instanceof String) {
                sb.append("\"").append(value).append("\"");
            } else if (value instanceof Boolean) {
                // Capitalize like FizzBee format: True/False
                sb.append(((Boolean) value) ? "True" : "False");
            } else {
                sb.append(value);
            }

            if (j < record.size() - 1) {
                sb.append(", ");
            }
            j++;
        }

        sb.append(")");
    }

    void logout() {
        page.locator("#userAvatar").click();
        page.getByRole(AriaRole.LINK, new Page.GetByRoleOptions().setName(" Logout")).click();
    }

    void open() {
            page = context.newPage();
            page.navigate("http://localhost:9100/");
    }
    void close() {
        // close Playwright
        if (page != null && !page.isClosed()) {
            page.close();
        }

//        if (context != null) {
//            context.close();
//        }
//        if (browser != null) {
//            browser.close();
//        }
//        if (playwright != null) {
//            playwright.close();
//        }
    }

    private void safeRun(String label, Runnable action) {
        try {
            action.run();
        } catch (Exception e) {
            // Log and ignore Playwright exceptions to avoid test interruption
            e.printStackTrace();
        }
    }
}

