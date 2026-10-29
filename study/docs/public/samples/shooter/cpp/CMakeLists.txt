cmake_minimum_required(VERSION 3.20)
project(sny0_shooter LANGUAGES C CXX)

set(CMAKE_CXX_STANDARD 17)
set(CMAKE_CXX_STANDARD_REQUIRED ON)
set(CMAKE_CXX_EXTENSIONS OFF)

add_library(shooter_model INTERFACE)
target_include_directories(shooter_model INTERFACE "${CMAKE_CURRENT_SOURCE_DIR}")

include(CTest)
if(BUILD_TESTING)
    add_executable(model_checks model_checks.cpp)
    target_link_libraries(model_checks PRIVATE shooter_model)
    add_test(NAME shooter_model_checks COMMAND model_checks)
endif()

option(SHOOTER_BUILD_GAME "Build the raylib window/input adapter" ON)
option(SHOOTER_FETCH_RAYLIB "Fetch raylib 5.5 when no matching package is installed" ON)
if(SHOOTER_BUILD_GAME)
    # Prefer an installed package. The fallback is fixed to the 5.5 release tag,
    # rather than a moving branch. Model-only checks do not need raylib/network.
    find_package(raylib 5.5 EXACT QUIET)
    if(NOT raylib_FOUND)
        if(NOT SHOOTER_FETCH_RAYLIB)
            message(FATAL_ERROR "raylib 5.5 was not found. Set raylib_DIR or allow SHOOTER_FETCH_RAYLIB.")
        endif()
        include(FetchContent)
        set(BUILD_EXAMPLES OFF CACHE BOOL "Build raylib examples" FORCE)
        FetchContent_Declare(raylib
            GIT_REPOSITORY https://github.com/raysan5/raylib.git
            GIT_TAG 5.5
            GIT_SHALLOW TRUE
        )
        FetchContent_MakeAvailable(raylib)
    endif()
    add_executable(shooter main.cpp)
    target_link_libraries(shooter PRIVATE shooter_model raylib)
endif()
