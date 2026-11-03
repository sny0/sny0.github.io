cmake_minimum_required(VERSION 3.20)
project(float_comparison_observation LANGUAGES CXX)

add_executable(float_comparison_observation main.cpp)
target_compile_features(float_comparison_observation PRIVATE cxx_std_20)
set_target_properties(float_comparison_observation PROPERTIES CXX_EXTENSIONS OFF)
if(MSVC)
    target_compile_options(float_comparison_observation PRIVATE
        /W4 /WX /permissive- /EHsc /utf-8 /fp:strict)
elseif(CMAKE_CXX_COMPILER_ID MATCHES "Clang")
    target_compile_options(float_comparison_observation PRIVATE
        -Wall -Wextra -Wpedantic -Werror -ffp-model=strict)
elseif(CMAKE_CXX_COMPILER_ID STREQUAL "GNU")
    target_compile_options(float_comparison_observation PRIVATE
        -Wall -Wextra -Wpedantic -Werror -fno-fast-math -frounding-math -ffp-contract=off)
else()
    message(FATAL_ERROR "Configure floating-point environment access for this compiler before running the sample.")
endif()
