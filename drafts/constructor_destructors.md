# Construction and Destruction, oh my

## Constructors

Inserted argument r4 is 0 or -1, -1 if constructor is for concrete type, making it responsible for constructing virtual bases and setting vbase pointers in the subobjects as needed.

## Destructors

there's actually three cases for destruction:

destructor called on concrete type, need to deallocate yourself with a call to free
destructor called on concrete type, stack allocated
destructor called on a base type

In 1, the destructor gets the magic argument 1, signaling it needs to use a call to __dl__FPv to clean up allocated memory
In 2, the destructor gets -1(0xffffffff) as the argument
In 3, the destructor gets 0
the second case(where the destructor gets -1 as an argument) is used to decide who needs to call the destructors of any virtual bases
so if the argument is 1 or -1, this is the destructor that calls the virtual base class destructor(s), else we're not the concrete type and need to only destroy ourselves and our direct base classes
and -1 vs 1 is to decide whether to call free
