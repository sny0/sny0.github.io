cmake_minimum_required(VERSION 3.20)
project(windows_process_observation LANGUAGES CXX)

if(NOT WIN32)
    message(FATAL_ERROR "This sample uses the Windows 10+ process and job APIs.")
endif()

add_executable(process_observation main.cpp)
target_compile_features(process_observation PRIVATE cxx_std_17)
set_target_properties(process_observation PROPERTIES CXX_EXTENSIONS OFF)
target_compile_definitions(process_observation PRIVATE
    WIN32_LEAN_AND_MEAN NOMINMAX _WIN32_WINNT=0x0A00)
target_link_libraries(process_observation PRIVATE Kernel32)
if(MSVC)
    target_compile_options(process_observation PRIVATE /W4 /WX /permissive- /EHsc /utf-8)
else()
    target_compile_options(process_observation PRIVATE -Wall -Wextra -Wpedantic -Werror)
endif()
