# Non-polymorphic inheritance

As a baseline, let's look at what happens when there's neither virtual functions nor virtual inheritance involved in the inheritance hierarchy.

MWCC does the obvious thing and just plops each class in the inheritance tree down in a declaration order. This layouting algorithm will not change no matter the type of inheritance involved.

Without virtual functions or inheritance involved, there is no difference with Itanium here so I won't be comparing the two for this case. To show the basics of the diagrams I'll be using throughout, here's an example with a few levels of inheritance: 

```cpp
struct A {
    int a;
};

struct B : A {
    int b;
};

struct C : A {
    int c;
};

struct D : B,C {
    int d;
};
```
```dot
digraph G {
    rankdir=LR;
    splines=false;
    node [shape=none];
    
    D [label=<<table cellspacing="0">
        <tr><td rowspan="5">D</td><td rowspan="2">B</td><td>A</td><td>0x0</td><td>B::A::a</td></tr>
        <tr><td colspan="2">0x4</td><td>B::b</td></tr>
        <tr><td rowspan="2">C</td><td>A</td><td>0x8</td><td>C::A::a</td></tr>
        <tr><td colspan="2">0xc</td><td>C::c</td></tr>
        <tr><td colspan="3">0x10</td><td>d</td></tr>
    </table>>];
}
```

