cmake_minimum_required(VERSION 3.20)
project(windows_memory_observation LANGUAGES CXX)

if(NOT WIN32)
    message(FATAL_ERROR "This sample uses the Windows virtual-memory API.")
endif()

add_executable(memory_observation main.cpp)
target_compile_features(memory_observation PRIVATE cxx_std_17)
set_target_properties(memory_observation PROPERTIES CXX_EXTENSIONS OFF)
target_compile_definitions(memory_observation PRIVATE
    WIN32_LEAN_AND_MEAN NOMINMAX PSAPI_VERSION=1)
target_link_libraries(memory_observation PRIVATE Psapi)
if(MSVC)
    target_compile_options(memory_observation PRIVATE /W4 /permissive- /EHsc /utf-8)
else()
    target_compile_options(memory_observation PRIVATE -Wall -Wextra -Wpedantic)
endif()
