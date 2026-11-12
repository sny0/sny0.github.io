#include <algorithm>
#include <array>
#include <cstdlib>
#include <functional>
#include <iostream>
#include <limits>
#include <optional>
#include <queue>
#include <string>
#include <string_view>
#include <tuple>
#include <utility>
#include <vector>

struct Point {
    int x;
    int y;
};

using Grid = std::array<std::string_view, 5>; // All rows have the same width.

struct Result {
    std::optional<int> cost;
    int expanded = 0;
    std::vector<int> path;
};

Result search(const Grid& grid, Point start, Point goal, bool use_heuristic) {
    const int width = static_cast<int>(grid.front().size());
    const int height = static_cast<int>(grid.size());
    const auto passable = [&](Point p) {
        return 0 <= p.x && p.x < width && 0 <= p.y && p.y < height &&
               grid[p.y][p.x] != '#';
    };
    if (!passable(start) || !passable(goal)) {
        return {};
    }

    const auto index = [width](Point p) { return p.y * width + p.x; };
    const auto heuristic = [&](Point p) {
        // Every legal move changes one coordinate by one and costs at least 1.
        return use_heuristic ? std::abs(p.x - goal.x) + std::abs(p.y - goal.y) : 0;
    };
    constexpr std::array<Point, 4> directions{{{1, 0}, {-1, 0}, {0, 1}, {0, -1}}};

    std::vector<int> best(width * height, std::numeric_limits<int>::max());
    std::vector<int> previous(width * height, -1);
    using Entry = std::tuple<int, int, int, int>; // f, h, g, cell ID
    std::priority_queue<Entry, std::vector<Entry>, std::greater<>> frontier;
    const int source = index(start);
    const int target = index(goal);
    best[source] = 0;
    frontier.emplace(heuristic(start), heuristic(start), 0, source);

    Result result;
    while (!frontier.empty()) {
        const auto [f, h, cost, cell] = frontier.top();
        frontier.pop();
        if (cost != best[cell]) {
            continue; // A cheaper entry for this cell was added later.
        }
        ++result.expanded; // Count valid pops, including the goal.
        if (cell == target) {
            result.cost = cost;
            for (int step = cell; step != -1; step = previous[step]) {
                result.path.push_back(step);
            }
            std::reverse(result.path.begin(), result.path.end());
            return result;
        }

        const Point current{cell % width, cell / width};
        for (Point direction : directions) {
            const Point next{current.x + direction.x, current.y + direction.y};
            if (!passable(next)) {
                continue;
            }
            const int neighbor = index(next);
            const int move_cost = grid[next.y][next.x] == '9' ? 9 : 1;
            const int candidate = cost + move_cost;
            if (candidate < best[neighbor]) {
                const int estimate = heuristic(next);
                best[neighbor] = candidate;
                previous[neighbor] = cell;
                frontier.emplace(candidate + estimate, estimate, candidate, neighbor);
            }
        }
    }
    return result;
}

void print_path(const Grid& grid, const Result& result) {
    const int width = static_cast<int>(grid.front().size());
    std::array<std::string, std::tuple_size_v<Grid>> rows;
    for (std::size_t y = 0; y < grid.size(); ++y) {
        rows[y] = grid[y];
    }
    for (int cell : result.path) {
        char& tile = rows[cell / width][cell % width];
        if (tile != 'S' && tile != 'G') {
            tile = '*';
        }
    }
    for (const auto& row : rows) {
        std::cout << row << '\n';
    }
}

int main() {
    constexpr Grid grid{"S999999G", ".#....#.", "........", "...##...", "........"};
    constexpr Grid disconnected{"S######G", ".######.", ".######.", ".######.", ".######."};
    constexpr Point start{0, 0};
    constexpr Point goal{7, 0};
    const Result dijkstra = search(grid, start, goal, false);
    const Result astar = search(grid, start, goal, true);
    const Result no_path = search(disconnected, start, goal, true);
    const Result same_cell = search(grid, start, start, true);

    if (dijkstra.cost != 11 || astar.cost != 11 || no_path.cost || same_cell.cost != 0) {
        std::cerr << "Unexpected search result\n";
        return 1;
    }
    std::cout << "Dijkstra: cost=" << *dijkstra.cost << ", expanded=" << dijkstra.expanded << '\n';
    std::cout << "A*: cost=" << *astar.cost << ", expanded=" << astar.expanded << '\n';
    print_path(grid, astar);
    std::cout << "Disconnected: no path\n";
    std::cout << "Start equals goal: cost=" << *same_cell.cost << '\n';
}
