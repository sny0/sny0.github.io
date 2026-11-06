---
title: 2つのC++ファイルからOBJ・EXE・PDBを作って読む
study:
  source: 新規執筆
  section: practice
  format: sample
  status: published
  domain: compilers
  collection: build-artifact-observation
  order: 1
  summary: 呼び出し元と呼び出し先を別のOBJにコンパイルし、DUMPBINで再配置、実行ファイルのインポート、デバッグ情報をたどる。
  aliases: [MSVC, DUMPBIN, OBJ, COFF, PE, EXE, PDB, relocation, 再配置]
  verification: x64 MSVCでビルド・実行し、REL32とadjustの定義、リンク時のPDBの生成を確認（2026-11-06）
---

# 2つのC++ファイルからOBJ・EXE・PDBを作って読む

`caller.cpp` の `main` から、別ファイルにある `adjust` を呼び出します。呼び出し元のOBJに記録された参照がリンクでどうつながり、Windowsが読むEXEに何が入るかを確かめます。[COFFの再配置](/compilers/coff-relocations.html) · [WindowsのPEローダー](/os/pe-loading-and-imports.html)

## 手元で動かす {#run-locally}

MSVCのC++ツールが入っている環境で、<a href="/study/samples/compilers/build-artifact-observation/caller.cpp" download>caller.cpp</a>と<a href="/study/samples/compilers/build-artifact-observation/target.cpp" download>target.cpp</a>を新しい作業フォルダーに保存します。Visual Studioの **x64 Native Tools Command Prompt** でそのフォルダーを開き、次を実行します。[Microsoftのコマンドライン用C++ツール](https://learn.microsoft.com/en-us/cpp/build/building-on-the-command-line?view=msvc-170)

```bat
cl /nologo /std:c++20 /Od /Z7 /MD /c caller.cpp target.cpp
dumpbin /relocations caller.obj
dumpbin /symbols target.obj
```

`/c` でリンクせずに、`caller.obj` と `target.obj` を作ります。呼び出し元の再配置一覧で、`adjust` を参照する `REL32` を探します。呼び出し先のシンボル一覧では `adjust` が定義されています。ここでは `extern "C"` を使い、C++のオーバーロード情報による名前修飾を避けています。[DUMPBINのRELOCATIONSオプション](https://learn.microsoft.com/en-us/cpp/build/reference/relocations?view=msvc-170) · [MSVCの名前修飾](https://learn.microsoft.com/en-us/cpp/build/reference/decorated-names?view=msvc-170)

続けてリンクして実行します。

```bat
link /nologo /debug:full /incremental:no /out:build-observation.exe caller.obj target.obj
build-observation.exe
dumpbin /headers build-observation.exe
dumpbin /imports build-observation.exe
```

表示は `Score: 42` です。`/headers` でマシン種別、イメージベース、セクションを見ます。`/imports` で、実行時に使うDLLやそのインポートを調べます。2つのOBJの中で解決した `adjust` は、このEXEのDLLインポートには出てきません。インポートされるランタイムの関数名やアドレスはツールチェーンの構成で変わることがあります。[DUMPBINのHEADERS](https://learn.microsoft.com/en-us/cpp/build/reference/headers?view=msvc-170) · [DUMPBINのIMPORTS](https://learn.microsoft.com/en-us/cpp/build/reference/imports-dumpbin?view=msvc-170)

`/Z7` でOBJに入れたデバッグ情報をリンカーがまとめ、`/DEBUG:FULL` で `build-observation.pdb` が作られます。クラッシュを調べるときは、対象のEXEやDLLと対応するPDBを使います。[MicrosoftのZ7とZi](https://learn.microsoft.com/en-us/cpp/build/reference/z7-zi-zi-debug-information-format?view=msvc-170) · [クラッシュダンプとシンボル](/tools/windows/crash-dumps-and-symbols.html)

## ソース

### 呼び出し元

<<< @/public/samples/compilers/build-artifact-observation/caller.cpp{cpp}

### 呼び出し先

<<< @/public/samples/compilers/build-artifact-observation/target.cpp{cpp}
