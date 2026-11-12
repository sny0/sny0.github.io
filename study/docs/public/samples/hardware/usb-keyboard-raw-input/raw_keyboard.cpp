#define WIN32_LEAN_AND_MEAN
#include <windows.h>

#include <algorithm>
#include <array>
#include <cstddef>
#include <cwchar>
#include <iterator>
#include <string_view>

namespace {

constexpr wchar_t window_class[] = L"Sny0RawKeyboardDemo";
constexpr wchar_t window_title[] = L"Raw Input - keyboard demo";

struct KeyEvent {
    USHORT make_code;
    USHORT flags;
    USHORT virtual_key;
};

std::array<KeyEvent, 10> recent_keys{};
std::size_t key_count = 0;

bool is_practice_key(USHORT virtual_key) {
    switch (virtual_key) {
    case VK_LEFT:
    case VK_UP:
    case VK_RIGHT:
    case VK_DOWN:
    case VK_SPACE:
        return true;
    default:
        return false;
    }
}

void record_key(HWND window, HRAWINPUT handle) {
    RAWINPUT raw{};
    UINT size = sizeof(raw);
    const UINT copied = GetRawInputData(handle, RID_INPUT, &raw, &size, sizeof(RAWINPUTHEADER));
    constexpr std::size_t keyboard_size = offsetof(RAWINPUT, data) + sizeof(RAWKEYBOARD);
    if (copied == static_cast<UINT>(-1) || copied < keyboard_size || raw.header.dwType != RIM_TYPEKEYBOARD) {
        return;
    }

    const RAWKEYBOARD& key = raw.data.keyboard;
    if (!is_practice_key(key.VKey) || key.MakeCode == KEYBOARD_OVERRUN_MAKE_CODE) {
        return;
    }

    const KeyEvent event{key.MakeCode, key.Flags, key.VKey};
    if (key_count < recent_keys.size()) {
        recent_keys[key_count++] = event;
    } else {
        std::shift_left(recent_keys.begin(), recent_keys.end(), 1);
        recent_keys.back() = event;
    }
    InvalidateRect(window, nullptr, TRUE);
}

void draw_text(HDC dc, int x, int y, std::wstring_view text) {
    TextOutW(dc, x, y, text.data(), static_cast<int>(text.size()));
}

void paint(HWND window) {
    PAINTSTRUCT info{};
    const HDC dc = BeginPaint(window, &info);
    const HGDIOBJ original_font = SelectObject(dc, GetStockObject(ANSI_FIXED_FONT));
    SetBkMode(dc, TRANSPARENT);

    draw_text(dc, 16, 16, L"Focus this window, then press and release an arrow key or Space.");
    draw_text(dc, 16, 38, L"The last 10 events are shown here until the window closes.");
    int y = 72;
    for (std::size_t index = 0; index < key_count; ++index) {
        const KeyEvent& key = recent_keys[index];
        const wchar_t* action = (key.flags & RI_KEY_BREAK) ? L"UP  " : L"DOWN";
        const wchar_t* e0 = (key.flags & RI_KEY_E0) ? L" E0" : L"";
        const wchar_t* e1 = (key.flags & RI_KEY_E1) ? L" E1" : L"";
        wchar_t line[120]{};
        const int length = std::swprintf(
            line, std::size(line), L"%ls  MakeCode=0x%04X  Flags=0x%04X  VKey=0x%04X%ls%ls",
            action, static_cast<unsigned>(key.make_code), static_cast<unsigned>(key.flags),
            static_cast<unsigned>(key.virtual_key), e0, e1);
        if (length > 0) {
            draw_text(dc, 16, y, std::wstring_view(line, static_cast<std::size_t>(length)));
        }
        y += 20;
    }

    SelectObject(dc, original_font);
    EndPaint(window, &info);
}

LRESULT CALLBACK window_proc(HWND window, UINT message, WPARAM wparam, LPARAM lparam) {
    switch (message) {
    case WM_INPUT:
        if (GET_RAWINPUT_CODE_WPARAM(wparam) == RIM_INPUT) {
            if (GetForegroundWindow() == window) {
                record_key(window, reinterpret_cast<HRAWINPUT>(lparam));
            }
            // Windows requires foreground WM_INPUT cleanup even if the sample skipped the event.
            DefWindowProcW(window, message, wparam, lparam);
        }
        return 0;
    case WM_PAINT:
        paint(window);
        return 0;
    case WM_DESTROY:
        PostQuitMessage(0);
        return 0;
    default:
        return DefWindowProcW(window, message, wparam, lparam);
    }
}

int show_failure(const wchar_t* action) {
    const DWORD error = GetLastError();
    wchar_t message[120]{};
    std::swprintf(message, std::size(message), L"%ls failed (Win32 error %lu).", action, error);
    MessageBoxW(nullptr, message, window_title, MB_OK | MB_ICONERROR);
    return 1;
}

} // namespace

int WINAPI wWinMain(HINSTANCE instance, HINSTANCE, PWSTR, int show_command) {
    WNDCLASSW window_type{};
    window_type.lpfnWndProc = window_proc;
    window_type.hInstance = instance;
    window_type.hCursor = LoadCursor(nullptr, IDC_ARROW);
    window_type.hbrBackground = GetSysColorBrush(COLOR_WINDOW);
    window_type.lpszClassName = window_class;
    if (!RegisterClassW(&window_type)) {
        return show_failure(L"RegisterClassW");
    }

    const HWND window = CreateWindowExW(0, window_class, window_title, WS_OVERLAPPEDWINDOW,
        CW_USEDEFAULT, CW_USEDEFAULT, 720, 340, nullptr, nullptr, instance, nullptr);
    if (!window) {
        return show_failure(L"CreateWindowExW");
    }

    // Generic Desktop Controls usage page (0x01), Keyboard usage (0x06).
    const RAWINPUTDEVICE keyboard{0x01, 0x06, 0, window};
    if (!RegisterRawInputDevices(&keyboard, 1, sizeof(keyboard))) {
        return show_failure(L"RegisterRawInputDevices");
    }

    ShowWindow(window, show_command);
    MSG message{};
    BOOL result;
    while ((result = GetMessageW(&message, nullptr, 0, 0)) > 0) {
        TranslateMessage(&message);
        DispatchMessageW(&message);
    }
    return result == -1 ? show_failure(L"GetMessageW") : static_cast<int>(message.wParam);
}
